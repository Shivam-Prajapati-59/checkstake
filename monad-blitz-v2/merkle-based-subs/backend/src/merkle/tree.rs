use anyhow::{Context, Result};
use sha3::{Digest, Keccak256};
use sqlx::PgPool;

/// Keccak256 hash helper
fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// OpenZeppelin-compatible sorted-pair hash for internal nodes.
/// MerkleProof.verify uses: keccak256(abi.encodePacked(min(a,b), max(a,b)))
fn hash_pair(a: [u8; 32], b: [u8; 32]) -> [u8; 32] {
    let mut combined = [0u8; 64];
    if a <= b {
        combined[..32].copy_from_slice(&a);
        combined[32..].copy_from_slice(&b);
    } else {
        combined[..32].copy_from_slice(&b);
        combined[32..].copy_from_slice(&a);
    }
    keccak256(&combined)
}

/// Compute a leaf hash matching the Solidity contract:
/// `keccak256(bytes.concat(keccak256(abi.encode(address, expiration))))`
/// This is OpenZeppelin's StandardMerkleTree double-hash format.
pub fn compute_leaf(address_hex: &str, expiration: i64) -> Result<[u8; 32]> {
    let clean_addr = address_hex.trim_start_matches("0x");
    let pubkey_bytes = hex::decode(clean_addr).context("Invalid hex address")?;

    if pubkey_bytes.len() != 20 {
        return Err(anyhow::anyhow!("Ethereum address must be 20 bytes"));
    }

    // abi.encode(address, uint256): address left-padded to 32 bytes + uint256 left-padded to 32 bytes
    let mut encoded = vec![0u8; 64];
    encoded[12..32].copy_from_slice(&pubkey_bytes);

    let exp_bytes = expiration.to_be_bytes(); // i64 = 8 bytes
    encoded[56..64].copy_from_slice(&exp_bytes);

    // Double hash: keccak256(bytes.concat(keccak256(abi.encode(user, expiration))))
    let inner_hash = keccak256(&encoded);
    Ok(keccak256(&inner_hash))
}

/// An OpenZeppelin-compatible Merkle tree.
/// Uses sorted-pair hashing so proofs work with `MerkleProof.verify`.
pub struct OzMerkleTree {
    /// All layers of the tree. layers[0] = leaves, layers[last] = root
    layers: Vec<Vec<[u8; 32]>>,
}

impl OzMerkleTree {
    /// Build the tree from a set of leaf hashes.
    /// Leaves should already be double-hashed via `compute_leaf`.
    pub fn from_leaves(leaves: &[[u8; 32]]) -> Self {
        assert!(!leaves.is_empty(), "Cannot build tree from empty leaves");

        // Sort leaves for deterministic ordering (matches OZ StandardMerkleTree)
        let mut sorted_leaves = leaves.to_vec();
        sorted_leaves.sort();

        let mut layers: Vec<Vec<[u8; 32]>> = vec![sorted_leaves];

        // Build layers bottom-up
        while layers.last().unwrap().len() > 1 {
            let current = layers.last().unwrap();
            let mut next_layer = Vec::new();

            for chunk in current.chunks(2) {
                if chunk.len() == 2 {
                    next_layer.push(hash_pair(chunk[0], chunk[1]));
                } else {
                    // Odd node: promote it up (OZ behavior)
                    next_layer.push(chunk[0]);
                }
            }

            layers.push(next_layer);
        }

        OzMerkleTree { layers }
    }

    /// Get the root hash
    pub fn root(&self) -> [u8; 32] {
        *self.layers.last().unwrap().first().unwrap()
    }

    /// Generate a Merkle proof for a given leaf hash.
    /// Returns None if the leaf is not in the tree.
    pub fn get_proof(&self, leaf: &[u8; 32]) -> Option<Vec<[u8; 32]>> {
        let leaves = &self.layers[0];
        let mut index = leaves.iter().position(|l| l == leaf)?;

        let mut proof = Vec::new();

        for layer in &self.layers[..self.layers.len() - 1] {
            let sibling_index = if index % 2 == 0 {
                index + 1
            } else {
                index - 1
            };

            if sibling_index < layer.len() {
                proof.push(layer[sibling_index]);
            }

            // Move to parent index
            index /= 2;
        }

        Some(proof)
    }

    /// Verify a proof against a root (off-chain verification).
    /// This mirrors OpenZeppelin's MerkleProof.verify logic.
    pub fn verify(root: &[u8; 32], proof: &[[u8; 32]], leaf: &[u8; 32]) -> bool {
        let mut computed = *leaf;
        for sibling in proof {
            computed = hash_pair(computed, *sibling);
        }
        computed == *root
    }
}

// ───────────────────────────────────────────────────
// Public API used by main.rs
// ───────────────────────────────────────────────────

pub async fn build_tree_from_db(
    pool: &PgPool,
) -> Result<(String, OzMerkleTree, Vec<(String, i64)>)> {
    let rows = sqlx::query_as::<_, (String, i64)>(
        "SELECT wallet_address, expiration_ts FROM subscriber_storage",
    )
    .fetch_all(pool)
    .await?;

    let mut subscribers = rows;
    if subscribers.is_empty() {
        return Err(anyhow::anyhow!("No subscribers found in database"));
    }

    // Sort by wallet_address to keep the tree deterministic
    subscribers.sort_by(|a, b| a.0.cmp(&b.0));

    // Build leaves using the OZ-compatible double hash
    let leaves: Vec<[u8; 32]> = subscribers
        .iter()
        .map(|(address, exp)| compute_leaf(address, *exp).expect("Failed to compute leaf"))
        .collect();

    let tree = OzMerkleTree::from_leaves(&leaves);
    let root = tree.root();

    Ok((hex::encode(root), tree, subscribers))
}

/// Get a Merkle proof for a specific user.
/// Returns the proof as Vec<[u8; 32]> compatible with Solidity's bytes32[].
pub fn get_proof_for_user(
    tree: &OzMerkleTree,
    subscribers: &[(String, i64)],
    user_pubkey: &str,
) -> Option<Vec<[u8; 32]>> {
    let (_, exp) = subscribers.iter().find(|(pk, _)| pk == user_pubkey)?;
    let leaf = compute_leaf(user_pubkey, *exp).ok()?;
    tree.get_proof(&leaf)
}

/// Off-chain verification of a subscription proof.
/// Uses the same sorted-pair hashing as OpenZeppelin, so if this passes,
/// the on-chain verification will pass too.
pub fn verify_subscription(
    root_hex: &str,
    proof: &[[u8; 32]],
    user_pubkey: &str,
    expiration_ts: i64,
) -> Result<bool> {
    let root_vec = hex::decode(root_hex).context("Invalid root hex")?;
    let root: [u8; 32] = root_vec
        .try_into()
        .map_err(|_| anyhow::anyhow!("Root must be 32 bytes"))?;

    let leaf = compute_leaf(user_pubkey, expiration_ts)?;

    Ok(OzMerkleTree::verify(&root, proof, &leaf))
}
