use anyhow::{Context, Result};
use ethers::prelude::*;
use std::sync::Arc;
use std::convert::TryFrom;
use std::str::FromStr;

// Generate contract bindings — includes verifySubscription for on-chain proof verification
abigen!(
    MerkleUpdater,
    r#"[
        function updateMerkleRoot(bytes32 newRoot) external returns (bool)
        function currentRoot() external view returns (bytes32)
        function verifySubscription(bytes32[] proof, uint256 expiration) external
    ]"#,
);

pub struct EthereumClient {
    pub provider: Provider<Http>,
    pub contract: MerkleUpdater<SignerMiddleware<Provider<Http>, LocalWallet>>,
}

impl EthereumClient {
    pub async fn new(
        rpc_url: &str,
        private_key_hex: &str,
        contract_address_hex: &str,
    ) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url).context("Invalid RPC URL")?;

        let chain_id = provider.get_chainid().await?.as_u64();

        // 0x prefix removal for hex parsing
        let pk_clean = private_key_hex.trim_start_matches("0x");
        let wallet = pk_clean
            .parse::<LocalWallet>()
            .context("Invalid private key")?
            .with_chain_id(chain_id);

        let contract_address =
            Address::from_str(contract_address_hex).context("Invalid contract address")?;

        let client = SignerMiddleware::new(provider.clone(), wallet);
        let client_arc = Arc::new(client);

        let contract = MerkleUpdater::new(contract_address, client_arc);

        Ok(Self { provider, contract })
    }

    pub async fn update_merkle_root(&self, new_root: [u8; 32]) -> Result<String> {
        let call = self.contract.update_merkle_root(new_root);
        let pending_tx = call.send().await.context("Failed to send update transaction")?;

        let tx_hash = pending_tx.tx_hash();
        println!("✅ Sent Ethereum transaction! Hash: {:?}", tx_hash);

        let receipt = pending_tx
            .await?
            .context("Transaction was dropped or failed")?;

        if let Some(status) = receipt.status {
            if status.as_u64() == 0 {
                return Err(anyhow::anyhow!("Transaction reverted on EVM!"));
            }
        }

        println!("✅ Transaction confirmed! Block: {:?}", receipt.block_number);
        Ok(format!("{:?}", receipt.transaction_hash))
    }

    /// Get the signer's (backend wallet) address as a lowercase hex string
    pub fn signer_address(&self) -> String {
        let client = self.contract.client();
        let addr = client.signer().address();
        format!("0x{}", hex::encode(addr.as_bytes())) // lowercase to match DB convention
    }

    pub async fn get_current_root(&self) -> Result<[u8; 32]> {
        let root: [u8; 32] = self.contract.current_root().call().await?;
        Ok(root)
    }

    /// Verify a subscription on-chain by calling `verifySubscription(bytes32[], uint256)`.
    /// The contract checks:
    ///   1. expiration > block.timestamp (not expired)
    ///   2. MerkleProof.verify(proof, currentRoot, leaf) where leaf = double-hash of (msg.sender, expiration)
    /// Returns the tx hash on success.
    pub async fn verify_subscription_onchain(
        &self,
        proof: Vec<[u8; 32]>,
        expiration: u64,
    ) -> Result<String> {
        let call = self
            .contract
            .verify_subscription(proof, U256::from(expiration));

        let pending_tx = call
            .send()
            .await
            .context("Failed to send verifySubscription transaction")?;

        let tx_hash = pending_tx.tx_hash();
        println!("   📡 Sent verifySubscription tx: {:?}", tx_hash);

        let receipt = pending_tx
            .await?
            .context("verifySubscription transaction was dropped or failed")?;

        if let Some(status) = receipt.status {
            if status.as_u64() == 0 {
                return Err(anyhow::anyhow!(
                    "verifySubscription reverted! Proof may be invalid or subscription expired."
                ));
            }
        }

        println!(
            "   ✅ On-chain verification confirmed in block {:?}",
            receipt.block_number
        );
        Ok(format!("{:?}", receipt.transaction_hash))
    }
}
