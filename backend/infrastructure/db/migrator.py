"""SQL migration runner.

migrations/ klasöründeki *.sql dosyalarını ada göre sırayla çalıştırır.
Hangi migration'ların uygulandığı extensions._schema_migrations tablosunda takip edilir.
"""

from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

import asyncpg

from backend.infrastructure.shared.logger import get_logger

log = get_logger(__name__)

_MIGRATIONS_DIR = Path(__file__).parent.parent.parent.parent / "migrations"

_CREATE_TRACKING = """
CREATE TABLE IF NOT EXISTS extensions._schema_migrations (
    filename   TEXT        PRIMARY KEY,
    checksum   TEXT        NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


async def run_migrations(db_url: str) -> None:
    conn: asyncpg.Connection = await asyncpg.connect(db_url)
    try:
        await conn.execute(_CREATE_TRACKING)

        applied: set[str] = {
            row["filename"]
            for row in await conn.fetch("SELECT filename FROM extensions._schema_migrations ORDER BY filename")
        }

        sql_files = sorted(_MIGRATIONS_DIR.glob("*.sql"))
        if not sql_files:
            log.info("Uygulanacak migration bulunamadı")
            return

        ran_any = False
        for path in sql_files:
            name = path.name
            if name in applied:
                log.debug("Zaten uygulandı: %s", name)
                continue

            sql = path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql.encode()).hexdigest()

            log.info("Migration çalıştırılıyor: %s", name)
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO extensions._schema_migrations (filename, checksum) VALUES ($1, $2)",
                name,
                checksum,
            )
            log.info("Migration tamamlandı: %s", name)
            ran_any = True

        if ran_any:
            # PostgREST schema cache'ini yenile ve reloads için bekle
            await conn.execute("NOTIFY pgrst, 'reload schema'")
            log.info("PostgREST schema cache yenilendi")
            await asyncio.sleep(1.5)
    finally:
        await conn.close()
