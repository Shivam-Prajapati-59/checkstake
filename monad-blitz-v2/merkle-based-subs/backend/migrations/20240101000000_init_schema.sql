-- TABLE 1: Storage of Users (The Leaf Data)
CREATE TABLE subscriber_storage (
    wallet_address      VARCHAR(42) PRIMARY KEY, -- Hex Ethereum Address
    expiration_ts       BIGINT NOT NULL,         -- Unix Timestamp (i64)
    last_updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: Merkle State (The Global Program State)
CREATE TABLE merkle_state (
    id                  SERIAL PRIMARY KEY,
    root_hash           VARCHAR(66) NOT NULL,    -- Hex-encoded Keccak256 Root (0x + 64 chars)
    is_synced_on_chain  BOOLEAN DEFAULT FALSE,
    tx_signature        VARCHAR(66),             -- Ethereum Tx Hash for tracking
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);