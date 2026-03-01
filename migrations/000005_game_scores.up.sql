-- Таблица игровых рекордов для Space Shooter
CREATE TABLE IF NOT EXISTS game_scores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name VARCHAR(50)  NOT NULL,
    user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    score       INTEGER      NOT NULL DEFAULT 0,
    wave        INTEGER      NOT NULL DEFAULT 1,
    enemies_killed JSONB     NOT NULL DEFAULT '{"scout":0,"cruiser":0,"boss":0}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at DESC);
