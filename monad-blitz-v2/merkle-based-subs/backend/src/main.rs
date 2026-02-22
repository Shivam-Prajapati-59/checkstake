use anyhow::{Context, Result};
use chrono::Utc;
use serde_json::Value;
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::env;
use std::fs;
use std::time::Duration;

mod merkle;
mod model;

pub async fn get_db_pool() -> Result<PgPool> {
    let database_url =
        env::var("DATABASE_URL").context("DATABASE_URL must be set in environment or .env file")?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
        .context("Failed to connect to Postgres. Ensure the service is running.")?;

    Ok(pool)
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().context("Failed to load .env file")?;

    let pool = get_db_pool().await?;
    println!("✅ Successfully connected to database!");

    // Temporarily insert 5 mock users to test the Merkle functionality
    println!("   => Seeding database with 5 mock subscriptions...");
    merkle::generator::generate_and_store_keys(&pool, 5).await?;

    // Initialize Ethereum client
    let rpc_url =
        env::var("ETH_RPC_URL").unwrap_or_else(|_| "https://testnet-rpc.monad.xyz".to_string());
    
    // Read private key from JSON file
    let keypair_path =
        env::var("ETH_KEYPAIR_PATH").unwrap_or_else(|_| "./eth_keypair.json".to_string());
    
    let keypair_file = fs::read_to_string(&keypair_path)
        .context("Failed to read Ethereum keypair file")?;
    
    let keypair_json: Value = serde_json::from_str(&keypair_file)
        .context("Failed to parse Ethereum keypair JSON")?;
    
    let private_key = keypair_json["private_key"]
        .as_str()
        .context("No private_key field in JSON")?;

    let contract_address =
        env::var("ETH_CONTRACT_ADDRESS").unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string());

    let explorer_url = env::var("EXPLORER_URL").unwrap_or_else(|_| String::new());

    let eth_client = merkle::ethereum_client::EthereumClient::new(&rpc_url, private_key, &contract_address).await?;
    println!("✅ Connected to Ethereum RPC: {}", rpc_url);
    if !explorer_url.is_empty() {
        println!("   Explorer: {}", explorer_url);
    }

    // Seed the backend wallet as a subscriber so on-chain verification works
    // (the contract uses msg.sender to reconstruct the leaf)
    let signer_address = eth_client.signer_address();
    println!("   Backend wallet (signer): {}", signer_address);
    let signer_expiration = (Utc::now().timestamp() + (30 * 24 * 60 * 60)) as i64;
    let last_updated = Utc::now().naive_utc();
    sqlx::query!(
        "INSERT INTO subscriber_storage (wallet_address, expiration_ts, last_updated_at) VALUES ($1, $2, $3) ON CONFLICT (wallet_address) DO UPDATE SET expiration_ts = $2, last_updated_at = $3",
        signer_address,
        signer_expiration,
        last_updated
    )
    .execute(&pool)
    .await?;
    println!("   ✅ Backend wallet added as subscriber (exp: {})", signer_expiration);

    println!("\n🔍 Checking contract current root...");
    match eth_client.get_current_root().await {
        Ok(current_root) => {
            println!("   ✅ Contract is accessible");
            println!("   Current root: 0x{}", hex::encode(current_root));
        }
        Err(e) => {
            println!("   ⚠️  Could not fetch current root (maybe contract not deployed?): {}", e);
        }
    }

    // 1. Build Merkle Tree from database (OZ-compatible sorted-pair tree)
    let (root_hash, tree, subscriber_data) = merkle::tree::build_tree_from_db(&pool).await?;
    println!("\n🌲 Merkle Tree Built (OpenZeppelin-compatible):");
    println!("   Root Hash: 0x{}", root_hash);
    println!("   Total subscribers: {}", subscriber_data.len());

    // 2. Convert hex root to bytes
    let root_bytes: [u8; 32] = hex::decode(&root_hash)?
        .try_into()
        .map_err(|_| anyhow::anyhow!("Root must be 32 bytes"))?;

    // 3. Update the merkle root on-chain
    println!("\n📤 Syncing merkle root to chain...");
    match eth_client.update_merkle_root(root_bytes).await {
        Ok(tx_hash) => {
            println!("✅ Successfully updated on-chain!");
            println!("   Tx Hash: {}", tx_hash);
            if !explorer_url.is_empty() {
                println!("   🔍 View on explorer: {}/tx/{}", explorer_url.trim_end_matches('/'), tx_hash);
            }

            // 4. Store the transaction in database
            merkle::updatestate::update_merkle_state(
                &pool,
                &root_hash,
                Some(tx_hash),
            )
            .await?;
            println!("✅ Saved to database with tx hash");
        }
        Err(e) => {
            eprintln!("❌ Failed to update on-chain: {}", e);
            eprintln!("💡 Tip: Make sure the contract address is correct and you have MON on Monad testnet.");

            // Still save to database but mark as not synced
            merkle::updatestate::update_merkle_state(&pool, &root_hash, None).await?;
        }
    }

    // 5. Off-chain verification test (any subscriber)
    println!("\n🔐 Testing Off-Chain Proof Verification...");
    if let Some((first_user, expiration)) = subscriber_data.first() {
        println!("   User: {}", first_user);
        println!("   Expiration: {}", expiration);

        if let Some(proof) =
            merkle::tree::get_proof_for_user(&tree, &subscriber_data, first_user)
        {
            let is_valid = merkle::tree::verify_subscription(
                &root_hash,
                &proof,
                first_user,
                *expiration,
            )?;

            println!(
                "   Off-chain verification: {}",
                if is_valid { "✓ VALID" } else { "✗ INVALID" }
            );
        }
    }

    // 6. ON-CHAIN verification 🔗 (using the backend wallet which IS a subscriber)
    println!("\n🔗 Testing On-Chain Proof Verification...");
    println!("   Signer address: {}", signer_address);
    if let Some(proof) =
        merkle::tree::get_proof_for_user(&tree, &subscriber_data, &signer_address)
    {
        // Print proof in copy-paste format for the frontend
        let proof_hex: Vec<String> = proof
            .iter()
            .map(|h| format!("\"0x{}\"", hex::encode(h)))
            .collect();
        println!("\n   ╔══════════════════════════════════════════════════════════╗");
        println!("   ║  📋 COPY-PASTE INTO FRONTEND:                          ║");
        println!("   ╠══════════════════════════════════════════════════════════╣");
        println!("   ║  Proof:                                                 ║");
        println!("   ║  [{}]", proof_hex.join(","));
        println!("   ║                                                         ║");
        println!("   ║  Expiration: {}                              ", signer_expiration);
        println!("   ╚══════════════════════════════════════════════════════════╝");

        // Off-chain check first
        let is_valid_offchain = merkle::tree::verify_subscription(
            &root_hash,
            &proof,
            &signer_address,
            signer_expiration,
        )?;
        println!("   Off-chain pre-check: {}", if is_valid_offchain { "✓ VALID" } else { "✗ INVALID" });

        // Now call the contract
        println!("   Sending verifySubscription tx to contract...");
        match eth_client
            .verify_subscription_onchain(proof, signer_expiration as u64)
            .await
        {
            Ok(tx_hash) => {
                println!("   ✅ ON-CHAIN verification PASSED!");
                println!("   Tx Hash: {}", tx_hash);
                if !explorer_url.is_empty() {
                    println!("   🔍 View on explorer: {}/tx/{}", explorer_url.trim_end_matches('/'), tx_hash);
                }
            }
            Err(e) => {
                eprintln!("   ❌ ON-CHAIN verification FAILED: {}", e);
            }
        }
    } else {
        eprintln!("   ❌ Could not generate proof for signer address. Check DB.");
    }

    // 7. Test tampering detection (off-chain)
    println!("\n🧪 Testing Tampering Detection...");
    if let Some((first_user, _)) = subscriber_data.first() {
        if let Some(proof) =
            merkle::tree::get_proof_for_user(&tree, &subscriber_data, first_user)
        {
            let fake_expiration = 9999999999i64;
            let is_valid_tamper = merkle::tree::verify_subscription(
                &root_hash,
                &proof,
                first_user,
                fake_expiration,
            )?;

            println!(
                "   Tampered expiration: {}",
                if is_valid_tamper {
                    "❌ ACCEPTED (Bug!)"
                } else {
                    "✓ REJECTED (Correct)"
                }
            );
        }
    }

    Ok(())
}