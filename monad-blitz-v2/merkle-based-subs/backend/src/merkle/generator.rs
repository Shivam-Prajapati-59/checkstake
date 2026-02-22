use anyhow::Result;
use chrono::Utc;
use std::time::{SystemTime, UNIX_EPOCH};
use sqlx::PgPool;

pub async fn generate_and_store_keys(pool: &PgPool, count: usize) -> Result<()> {
    for i in 0..count {
        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        // Just mock a 40-character hex string for the address based on a counter and time
        let pubkey = format!("0x{:020x}{:020x}", start_time, i);

        // 2. Set expiration (e.g., 30 days from now)
        let expiration_ts = (Utc::now().timestamp() + (30 * 24 * 60 * 60)) as i64;

        // 3. Set last updated timestamp (using naive datetime for the DB)
        let last_updated_at = Utc::now().naive_utc();

        // 4. Store in DB
        sqlx::query!(
            "INSERT INTO subscriber_storage (wallet_address, expiration_ts, last_updated_at) VALUES ($1, $2, $3)",
            pubkey,
            expiration_ts,
            last_updated_at
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}
