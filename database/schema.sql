-- ============================================================
-- Global Disaster & Humanitarian Response Tracker
-- Database Schema - PostgreSQL (Supabase)
-- ============================================================
--Author- Prajwal

-- Drop tables in reverse dependency order (for re-runs)
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS disaster_areas CASCADE;
DROP TABLE IF EXISTS disasters CASCADE;
DROP TABLE IF EXISTS incident_types CASCADE;
DROP TABLE IF EXISTS declaration_types CASCADE;
DROP TABLE IF EXISTS states CASCADE;

-- ============================================================
-- Reference / Lookup Tables
-- ============================================================
--Author- Prajwal
CREATE TABLE states (
    state_code   CHAR(2)      PRIMARY KEY,
    state_abbrev CHAR(2)      UNIQUE NOT NULL,
    state_name   VARCHAR(50)  NOT NULL
);

CREATE TABLE declaration_types (
    type_code   CHAR(2)       PRIMARY KEY,
    type_name   VARCHAR(100)  NOT NULL,
    description TEXT
);

CREATE TABLE incident_types (
    incident_type_id   SERIAL       PRIMARY KEY,
    incident_type_name VARCHAR(100) UNIQUE NOT NULL,
    category           VARCHAR(50)
);

-- ============================================================
-- Core Data Tables
-- ============================================================
--Author- Tanmay

CREATE TABLE disasters (
    disaster_number    INTEGER      PRIMARY KEY,
    declaration_type   CHAR(2)      NOT NULL REFERENCES declaration_types(type_code),
    incident_type_id   INTEGER      NOT NULL REFERENCES incident_types(incident_type_id),
    declaration_title  VARCHAR(255) NOT NULL,
    declaration_date   DATE         NOT NULL,
    incident_begin_date DATE,
    incident_end_date   DATE,
    closeout_date       DATE,
    ih_program         BOOLEAN      DEFAULT FALSE,
    ia_program         BOOLEAN      DEFAULT FALSE,
    pa_program         BOOLEAN      DEFAULT FALSE,
    hm_program         BOOLEAN      DEFAULT FALSE,
    created_at         TIMESTAMP    DEFAULT NOW(),
    updated_at         TIMESTAMP    DEFAULT NOW(),
    is_deleted         BOOLEAN      DEFAULT FALSE
);

CREATE TABLE disaster_areas (
    area_id          SERIAL       PRIMARY KEY,
    disaster_number  INTEGER      NOT NULL REFERENCES disasters(disaster_number) ON DELETE CASCADE,
    state_code       CHAR(2)      NOT NULL REFERENCES states(state_code),
    fips_county_code VARCHAR(5),
    designated_area  VARCHAR(255),
    place_code       VARCHAR(10),
    UNIQUE (disaster_number, state_code, place_code)
);

-- ============================================================
-- Application Tables
-- ============================================================
--Author- Aditya

CREATE TABLE users (
    user_id       SERIAL        PRIMARY KEY,
    username      VARCHAR(100)  UNIQUE NOT NULL,
    email         VARCHAR(255)  UNIQUE NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at    TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE user_reports (
    report_id       SERIAL        PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    disaster_number INTEGER       REFERENCES disasters(disaster_number) ON DELETE SET NULL,
    title           VARCHAR(255)  NOT NULL,
    description     TEXT,
    severity        VARCHAR(20)   CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status          VARCHAR(20)   DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'closed')),
    created_at      TIMESTAMP     DEFAULT NOW(),
    updated_at      TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
--Author- Aditya

CREATE INDEX idx_disasters_declaration_date ON disasters(declaration_date);
CREATE INDEX idx_disasters_declaration_type ON disasters(declaration_type);
CREATE INDEX idx_disasters_incident_type    ON disasters(incident_type_id);
CREATE INDEX idx_disasters_is_deleted       ON disasters(is_deleted);
CREATE INDEX idx_disaster_areas_state       ON disaster_areas(state_code);
CREATE INDEX idx_disaster_areas_disaster    ON disaster_areas(disaster_number);
CREATE INDEX idx_user_reports_user          ON user_reports(user_id);
CREATE INDEX idx_user_reports_disaster      ON user_reports(disaster_number);
CREATE INDEX idx_user_reports_status        ON user_reports(status);

-- ============================================================
-- Seed Declaration Types
-- ============================================================
--Author- tanmay

INSERT INTO declaration_types (type_code, type_name, description) VALUES
('DR', 'Major Disaster', 'A Major Disaster Declaration provides a wide range of federal assistance programs for individuals and public infrastructure.'),
('EM', 'Emergency', 'An Emergency Declaration is more limited in scope and does not include long-term federal recovery programs.'),
('FM', 'Fire Management', 'Fire Management Assistance provides grants to states, tribes, and local governments for the mitigation, management, and control of fires on public or private forest land or grassland.');

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
--Author- Tanmay

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_disasters_updated_at
    BEFORE UPDATE ON disasters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reports_updated_at
    BEFORE UPDATE ON user_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
