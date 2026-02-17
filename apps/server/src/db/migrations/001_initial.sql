-- Cordis initial schema migration
-- Run with: psql $DATABASE_URL -f this_file.sql

BEGIN;

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT          PRIMARY KEY,
    username        VARCHAR(32)     NOT NULL,
    discriminator   CHAR(4)         NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   TEXT,
    avatar_url      TEXT,
    status          VARCHAR(16)     NOT NULL DEFAULT 'offline',
    is_bot          BOOLEAN         NOT NULL DEFAULT FALSE,
    oauth_provider  VARCHAR(32),
    oauth_id        TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT users_username_discriminator_unique UNIQUE (username, discriminator)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- ─────────────────────────────────────────
-- SERVERS (GUILDS)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servers (
    id              BIGINT          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    description     TEXT,
    icon_url        TEXT,
    banner_url      TEXT,
    owner_id        BIGINT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    invite_code     VARCHAR(12)     UNIQUE,
    is_public       BOOLEAN         NOT NULL DEFAULT FALSE,
    max_members     INT             NOT NULL DEFAULT 500000,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON servers (owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_invite_code ON servers (invite_code);

-- ─────────────────────────────────────────
-- ROLES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id              BIGINT          PRIMARY KEY,
    server_id       BIGINT          NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name            VARCHAR(100)    NOT NULL,
    color           INT             NOT NULL DEFAULT 0,
    position        SMALLINT        NOT NULL DEFAULT 0,
    permissions     BIGINT          NOT NULL DEFAULT 0,
    is_hoisted      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_mentionable  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_server_id ON roles (server_id);

-- ─────────────────────────────────────────
-- MEMBERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
    id              BIGSERIAL       PRIMARY KEY,
    server_id       BIGINT          NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname        VARCHAR(32),
    joined_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    timeout_until   TIMESTAMPTZ,
    CONSTRAINT members_server_user_unique UNIQUE (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_server_id ON members (server_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members (user_id);

CREATE TABLE IF NOT EXISTS member_roles (
    member_id       BIGINT          NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id         BIGINT          NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, role_id)
);

-- ─────────────────────────────────────────
-- CHANNELS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channels (
    id              BIGINT          PRIMARY KEY,
    server_id       BIGINT          REFERENCES servers(id) ON DELETE CASCADE,
    parent_id       BIGINT          REFERENCES channels(id) ON DELETE SET NULL,
    name            VARCHAR(100)    NOT NULL,
    type            VARCHAR(16)     NOT NULL DEFAULT 'text',
    topic           TEXT,
    position        SMALLINT        NOT NULL DEFAULT 0,
    is_nsfw         BOOLEAN         NOT NULL DEFAULT FALSE,
    slowmode_delay  SMALLINT        NOT NULL DEFAULT 0,
    bitrate         INT,
    user_limit      SMALLINT,
    last_message_id BIGINT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_server_id ON channels (server_id);
CREATE INDEX IF NOT EXISTS idx_channels_parent_id ON channels (parent_id);

CREATE TABLE IF NOT EXISTS channel_overwrites (
    id              BIGSERIAL       PRIMARY KEY,
    channel_id      BIGINT          NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    target_type     VARCHAR(8)      NOT NULL,
    target_id       BIGINT          NOT NULL,
    allow_perms     BIGINT          NOT NULL DEFAULT 0,
    deny_perms      BIGINT          NOT NULL DEFAULT 0,
    CONSTRAINT channel_overwrites_unique UNIQUE (channel_id, target_type, target_id)
);

-- ─────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              BIGINT          PRIMARY KEY,
    channel_id      BIGINT          NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id       BIGINT          REFERENCES users(id) ON DELETE SET NULL,
    content         TEXT            NOT NULL DEFAULT '',
    type            VARCHAR(16)     NOT NULL DEFAULT 'default',
    reference_id    BIGINT          REFERENCES messages(id) ON DELETE SET NULL,
    edited_at       TIMESTAMPTZ,
    is_pinned       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id_created ON messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages (author_id);

CREATE TABLE IF NOT EXISTS attachments (
    id              BIGINT          PRIMARY KEY,
    message_id      BIGINT          NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename        TEXT            NOT NULL,
    content_type    VARCHAR(100),
    size_bytes      INT             NOT NULL,
    url             TEXT            NOT NULL,
    width           INT,
    height          INT
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments (message_id);

CREATE TABLE IF NOT EXISTS reactions (
    id              BIGSERIAL       PRIMARY KEY,
    message_id      BIGINT          NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji           VARCHAR(64)     NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT reactions_unique UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions (message_id);

COMMIT;
