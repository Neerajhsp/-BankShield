-- =========================================================
-- BankShield AI — MySQL Schema
-- Run:  mysql -u root -p bankshield_ai < schema.sql
-- =========================================================

CREATE DATABASE IF NOT EXISTS bankshield_ai CHARACTER SET utf8mb4;
USE bankshield_ai;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS fraud_cases;
DROP TABLE IF EXISTS risk_profiles;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS beneficiaries;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------
-- users
-- -----------------------------------------------------
CREATE TABLE users (
    id              CHAR(36)      PRIMARY KEY,
    full_name       VARCHAR(120)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            ENUM('CUSTOMER','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    phone           VARCHAR(20)   NULL,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- accounts
-- -----------------------------------------------------
CREATE TABLE accounts (
    id              CHAR(36)      PRIMARY KEY,
    account_number  VARCHAR(20)   NOT NULL UNIQUE,
    user_id         CHAR(36)      NOT NULL,
    account_type    VARCHAR(30)   NOT NULL DEFAULT 'SAVINGS',
    balance         DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    status          ENUM('ACTIVE','FROZEN','CLOSED') NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_accounts_number (account_number),
    INDEX idx_accounts_user (user_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- beneficiaries
-- -----------------------------------------------------
CREATE TABLE beneficiaries (
    id                CHAR(36)      PRIMARY KEY,
    customer_id       CHAR(36)      NOT NULL,
    beneficiary_name  VARCHAR(120)  NOT NULL,
    account_number    VARCHAR(20)   NOT NULL,
    bank_name         VARCHAR(120)  NOT NULL,
    ifsc              VARCHAR(20)   NOT NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiaries_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_beneficiaries_customer (customer_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- transactions
-- -----------------------------------------------------
CREATE TABLE transactions (
    id                    CHAR(36)      PRIMARY KEY,
    reference             VARCHAR(30)   NOT NULL UNIQUE,
    sender_account_id     CHAR(36)      NULL,
    receiver_account_id   CHAR(36)      NULL,
    beneficiary_id        CHAR(36)      NULL,
    amount                DECIMAL(18,2) NOT NULL,
    type                  ENUM('DEPOSIT','WITHDRAWAL','TRANSFER') NOT NULL,
    status                ENUM('PENDING','COMPLETED','FAILED','FLAGGED','ON_HOLD','BLOCKED') NOT NULL DEFAULT 'PENDING',
    risk_score            INT           NOT NULL DEFAULT 0,
    risk_level            ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW',
    fraud_probability     DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    risk_reasons          JSON          NULL,
    is_new_beneficiary    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at           DATETIME      NULL,
    CONSTRAINT fk_txn_sender FOREIGN KEY (sender_account_id) REFERENCES accounts(id),
    CONSTRAINT fk_txn_receiver FOREIGN KEY (receiver_account_id) REFERENCES accounts(id),
    CONSTRAINT fk_txn_beneficiary FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
    INDEX idx_txn_reference (reference),
    INDEX idx_txn_created (created_at),
    INDEX idx_txn_status (status)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- risk_profiles
-- -----------------------------------------------------
CREATE TABLE risk_profiles (
    id                            CHAR(36)      PRIMARY KEY,
    customer_id                   CHAR(36)      NOT NULL UNIQUE,
    risk_level                    ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW',
    risk_score                    INT           NOT NULL DEFAULT 0,
    suspicious_transaction_count  INT           NOT NULL DEFAULT 0,
    avg_transaction_amount        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    transaction_frequency         INT           NOT NULL DEFAULT 0,
    updated_at                    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_risk_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- fraud_cases
-- -----------------------------------------------------
CREATE TABLE fraud_cases (
    id                     CHAR(36)      PRIMARY KEY,
    case_number            VARCHAR(30)   NOT NULL UNIQUE,
    transaction_id         CHAR(36)      NOT NULL,
    customer_id            CHAR(36)      NOT NULL,
    amount                 DECIMAL(18,2) NOT NULL,
    risk_score             INT           NOT NULL,
    fraud_probability      DECIMAL(5,2)  NOT NULL,
    risk_level             ENUM('LOW','MEDIUM','HIGH') NOT NULL,
    detection_reasons      JSON          NULL,
    status                 ENUM('OPEN','UNDER_REVIEW','RESOLVED','BLOCKED','FALSE_POSITIVE') NOT NULL DEFAULT 'OPEN',
    customer_notified      BOOLEAN       NOT NULL DEFAULT FALSE,
    admin_notified         BOOLEAN       NOT NULL DEFAULT FALSE,
    alert_sound_triggered  BOOLEAN       NOT NULL DEFAULT FALSE,
    admin_decision         VARCHAR(20)   NULL,
    reviewed_by            CHAR(36)      NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at            DATETIME      NULL,
    CONSTRAINT fk_fraud_txn FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_fraud_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_fraud_case_number (case_number),
    INDEX idx_fraud_status (status)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- notifications
-- -----------------------------------------------------
CREATE TABLE notifications (
    id             CHAR(36)      PRIMARY KEY,
    user_id        CHAR(36)      NOT NULL,
    type           ENUM('TRANSACTION','SECURITY','FRAUD','SYSTEM') NOT NULL,
    title          VARCHAR(150)  NOT NULL,
    message        TEXT          NOT NULL,
    is_read        BOOLEAN       NOT NULL DEFAULT FALSE,
    metadata_json  JSON          NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- audit_logs
-- -----------------------------------------------------
CREATE TABLE audit_logs (
    id             CHAR(36)      PRIMARY KEY,
    user_id        CHAR(36)      NULL,
    action         VARCHAR(80)   NOT NULL,
    entity         VARCHAR(50)   NOT NULL,
    entity_id      CHAR(36)      NULL,
    metadata_json  JSON          NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
