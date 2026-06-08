import express from "express";
import path from "path";
import fs from "fs";
import pg from "pg";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import { DatabaseState, Ticket, RaffleSettings, ThemeType, DiaperSize, PaymentOption } from "./src/types";

dotenv.config();

const { Pool } = pg;
const PORT = 3000;

// In local development, placing the JSON file inside node_modules prevents file watchers (like Vite or tsx)
// from detecting modifications and triggering hot reloads or server restarts.
const DB_FILE = process.env.VERCEL 
  ? path.join("/tmp", "db-rifa.json")
  : path.join(process.cwd(), "db-rifa.json");

// 1. Direct Connection Pool (via DATABASE_URL string) with self-healing circuit breaker
let dbPool: pg.Pool | null = null;
let dbPoolLastFailureTime = 0;
const DB_COOLDOWN_MS = 20000; // Keep disabled for 20 seconds after a connection/query failure to prevent hanging
let initDbPromise: Promise<void> | null = null;

// Populate initial cachedState in memory from local file on container boot for instant resilience
let cachedState: DatabaseState | null = (() => {
  try {
    const tmpPath = path.join("/tmp", "db-rifa.json");
    if (fs.existsSync(tmpPath)) {
      console.log("[Database Init] Semeando cache em memória através de /tmp/db-rifa.json...");
      return JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    }
    const rootPath = path.join(process.cwd(), "db-rifa.json");
    if (fs.existsSync(rootPath)) {
      console.log("[Database Init] Semeando cache em memória através do arquivo de build db-rifa.json...");
      return JSON.parse(fs.readFileSync(rootPath, "utf-8"));
    }
  } catch (e) {
    console.warn("[Database Init] Falha ao sementeiar cachedState local:", e);
  }
  return null;
})();

const databaseUrl = process.env.DATABASE_URL;

function isDbPoolActive(): boolean {
  if (!dbPool) return false;
  return (Date.now() - dbPoolLastFailureTime) > DB_COOLDOWN_MS;
}

if (databaseUrl) {
  console.log("[Supabase Conn] DATABASE_URL encontrada. Conectando ao PostgreSQL...");
  dbPool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 3,                         // Low connection limit for serverless to prevent exhaustion
    idleTimeoutMillis: 3000,        // Close idle connections quickly
    connectionTimeoutMillis: 3000,  // Fast 3-second connection timeout to let sleeping dbs wake up
    query_timeout: 4000,            // Wait max 4 seconds for queries to respond to avoid Vercel 504s
  });

  // Handle unexpected errors on idle clients to prevent crashing
  dbPool.on("error", (err) => {
    console.warn("[Supabase Conn] Canal de conexão PostgreSQL direta fechado ou indisponível (cooldown ativado):", err.message || err);
    dbPoolLastFailureTime = Date.now(); // Trigger temporary cooldown on sudden pool errors
  });
}

// 2. HTTP Connection Client (via SUPABASE_URL & SUPABASE_ANON_KEY API creds)
let supabaseClient: any = null;
let supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseAnonKey) {
  // Normalize url if it ends with /rest/v1/
  supabaseUrl = supabaseUrl.trim().replace(/\/rest\/v1\/?$/, "");
  console.log(`[Supabase REST] Credenciais da API detectadas (${supabaseUrl}). Conectando...`);
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

if (!databaseUrl && (!supabaseUrl || !supabaseAnonKey)) {
  console.log("[Local Conn] Nenhuma senha de nuvem declarada. Usando persistência baseada em arquivo JSON local.");
}

// Automatically create tables on start if using Direct Postgres, or check Connection if using API Client
async function initDatabase() {
  if (isDbPoolActive()) {
    try {
      await dbPool!.query(`
        CREATE TABLE IF NOT EXISTS raffle_state (
          id INT PRIMARY KEY,
          state TEXT NOT NULL
        );
      `);
      
      const countRes = await dbPool!.query("SELECT COUNT(*) FROM raffle_state WHERE id = 1;");
      const count = parseInt(countRes.rows[0].count);
      if (count === 0) {
        console.log("[Supabase Conn] Inicializando registro padrão de estado da rifa...");
        const initialState = getInitialState();
        await dbPool!.query(
          "INSERT INTO raffle_state (id, state) VALUES ($1, $2);",
          [1, JSON.stringify(initialState)]
        );
      }
      console.log("[Supabase Conn] Tabelas do banco de dados verificadas e prontas!");
    } catch (err: any) {
      console.warn("[Supabase Conn] Alerta: Erro/Timeout na conexão PostgreSQL direta durante a inicialização (ativando cooldown temporário e usando canais alternativos):", err.message || err);
      dbPoolLastFailureTime = Date.now();
    }
  }
  
  if (supabaseClient) {
    try {
      // Test querying the table
      const { data, error } = await supabaseClient.from("raffle_state").select("state").eq("id", 1);
      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          console.log("[Supabase REST] Tabela 'raffle_state' não encontrada no seu projeto Supabase.");
          console.log("[Supabase REST] Por favor, vá ao SQL Editor no Painel do Supabase e execute o comando de criação da tabela.");
        } else {
          console.warn("[Supabase REST] Alerta: Erro ao carregar do Supabase REST:", error.message);
        }
      } else if (!data || data.length === 0) {
        console.log("[Supabase REST] Sincronização REST: Inicializando registro padrão de estado no Supabase...");
        const initialState = getInitialState();
        const { error: insertError } = await supabaseClient.from("raffle_state").insert({ id: 1, state: JSON.stringify(initialState) });
        if (insertError) {
          console.warn("[Supabase REST] Alerta: Erro ao criar registro inicial no Supabase REST:", insertError.message);
        }
      } else {
        console.log("[Supabase REST] Conexão com Supabase via REST bem sucedida!");
      }
    } catch (err) {
      console.warn("[Supabase REST] Alerta: Falha na inicialização da REST API:", err);
    }
  }
}

// Helper to initialize database with default settings
function getInitialState(): DatabaseState {
  return {
    settings: {
      title: "Chá Rifa do Teo",
      description: "Queridos amigos e familiares, criamos este Chá Rifa para celebrar a chegada do Teo com muito carinho! Escolha seus números da sorte e concorra a prêmios especiais enquanto nos ajuda com as fraldas e enxoval.",
      prize: "1º Prêmio: Fritadeira Elétrica Airfryer Philips Walita | 2º Prêmio: Cesta de Chocolates Cacau Show de 1,5kg | 3º Prêmio: Mini Caixa de Som Bluetooth JBL",
      prizes: [
        "1º Prêmio: Fritadeira Elétrica Airfryer Philips Walita",
        "2º Prêmio: Cesta de Chocolates Cacau Show de 1,5kg",
        "3º Prêmio: Mini Caixa de Som Bluetooth JBL"
      ],
      pixKey: "pix-chafarifa@bancocentral.com.br",
      pixKeyType: "Chave Aleatória",
      whatsappNumber: "11999999999",
      pixCopyAndPaste: "",
      paymentDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].split('-').reverse().join('/'), // 15 days from now in DD/MM/YYYY format
      theme: "natural",
      raffleDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T18:00:00", // 30 days from now
      ticketPrice: 15.0,
      allowDiaper: true,
      allowPix: true,
      diaperSizes: ["RN", "P", "M", "G", "GG", "XG"],
      adminKey: process.env.ADMIN_KEY || "admin123", // Easy default key or env-sourced key
      numberOfTickets: 100,
      diaperRanges: [
        { from: 1, to: 15, size: "P" },
        { from: 16, to: 45, size: "M" },
        { from: 46, to: 80, size: "G" },
        { from: 81, to: 100, size: "GG" }
      ],
      howItWorks: "",
      diaperObservation: "Marcas sugeridas: Pampers, Huggies, MamyPoko ou Babysec."
    },
    tickets: {},
    drawnNumbers: []
  };
}

// Helper to validate admin keys, supporting database-stored setting and runtime environment override
function isValidAdminKey(key: any, dbSettingsAdminKey: string): boolean {
  if (!key) return false;
  const normalizedKey = String(key).trim();
  if (normalizedKey === String(dbSettingsAdminKey).trim()) return true;
  const envKey = process.env.ADMIN_KEY;
  if (envKey && normalizedKey === String(envKey).trim()) return true;
  return false;
}

// Run structure migrations & save if anything changes
async function migrateAndSaveState(db: DatabaseState): Promise<DatabaseState> {
  let dirty = false;
  if (!db.settings) {
    return getInitialState();
  }
  if (!db.settings.diaperRanges) {
    db.settings.diaperRanges = [
      { from: 1, to: 15, size: "P" },
      { from: 16, to: 45, size: "M" },
      { from: 46, to: 80, size: "G" },
      { from: 81, to: 100, size: "GG" }
    ];
    dirty = true;
  }
  if (!db.settings.prizes) {
    if (db.settings.prize) {
      db.settings.prizes = db.settings.prize.split("|").map(p => p.trim()).filter(Boolean);
    } else {
      db.settings.prizes = ["1º Prêmio: Fritadeira Elétrica Airfryer Philips Walita"];
    }
    dirty = true;
  }
  if (!db.settings.pixKey) {
    db.settings.pixKey = "pix-chafarifa@bancocentral.com.br";
    db.settings.pixKeyType = "Chave Aleatória";
    dirty = true;
  }
  if (!db.settings.whatsappNumber) {
    db.settings.whatsappNumber = "11999999999";
    dirty = true;
  }
  if (db.settings.pixCopyAndPaste === undefined) {
    db.settings.pixCopyAndPaste = "";
    dirty = true;
  }
  if (db.settings.paymentDeadline === undefined) {
    const defaultDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].split('-').reverse().join('/');
    db.settings.paymentDeadline = defaultDeadline;
    dirty = true;
  }
  if (db.settings.diaperSizes) {
    const migrated = db.settings.diaperSizes.map(sz => sz === 'XP' as any ? 'RN' : sz) as DiaperSize[];
    if (JSON.stringify(migrated) !== JSON.stringify(db.settings.diaperSizes)) {
      db.settings.diaperSizes = migrated;
      dirty = true;
    }
  }
  if (db.settings.diaperRanges) {
    db.settings.diaperRanges = db.settings.diaperRanges.map(r => {
      if (r.size === 'XP' as any) {
        r.size = 'RN';
        dirty = true;
      }
      return r;
    });
  }
  if (db.tickets) {
    Object.values(db.tickets).forEach(t => {
      if (t.diaperSize === 'XP' as any) {
        t.diaperSize = 'RN';
        dirty = true;
      }
    });
  }

  if (dirty) {
    await saveRaffleState(db);
  }
  cachedState = db;
  return db;
}

// Fetch raffle state asynchronously using active backend engine choice with robust failover
async function getRaffleState(): Promise<DatabaseState> {
  // Wait for DB initialization to complete if it's running
  if (initDbPromise) {
    try {
      await initDbPromise;
    } catch (e: any) {
      console.warn("[Database] Informação: Falha ao aguardar inicialização do DB durante carregamento (usando cache local/memória se disponível):", e.message || e);
    }
  }

  const isCloudMode = !!(databaseUrl || (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY));

  // 1. Try direct Postgres if enabled and active
  if (isDbPoolActive()) {
    try {
      const res = await dbPool!.query("SELECT state FROM raffle_state WHERE id = 1;");
      if (res.rows.length > 0) {
        const db: DatabaseState = JSON.parse(res.rows[0].state);
        return await migrateAndSaveState(db);
      }
    } catch (err: any) {
      console.warn("[Supabase Conn] Alerta: Falha ao ler do SQL. Ativando cooldown de Postgres temporário:", err.message || err);
      dbPoolLastFailureTime = Date.now();
      // Fall through to try other backends
    }
  }

  // 2. Try Supabase REST Client
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("raffle_state").select("state").eq("id", 1).single();
      if (error) {
        console.warn("[Supabase REST] Alerta: Erro ao ler dados via REST:", error.message);
      } else if (data && data.state) {
        const db: DatabaseState = typeof data.state === "string" ? JSON.parse(data.state) : data.state;
        return await migrateAndSaveState(db);
      }
    } catch (err: any) {
      console.warn("[Supabase REST] Alerta: Exception ao ler do REST API:", err.message || err);
    }
  }

  // 3. Fallback to cached memory state (Prevents losing data upon temporary cloud DB outage)
  if (cachedState) {
    console.warn("[Database] Usando cópia do estado em cache de memória devido a instabilidade temporária na nuvem.");
    return cachedState;
  }

  // 4. Fallback to reading database from file system
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db: DatabaseState = JSON.parse(data);
      cachedState = db;
      return await migrateAndSaveState(db);
    }
  } catch (error: any) {
    console.warn("Informação: Erro ao ler DB do arquivo local:", error.message || error);
  }

  // If we are in cloud mode and have no cache or file backup, do not return raw initialState
  // as it would overwrite cloud DB and cause 401 unauthorized due to adminKey reset.
  if (isCloudMode) {
    throw new Error("Não foi possível conectar ao banco de dados remoto no momento e nenhuma cópia local/cacheada foi encontrada. Por favor, tente novamente.");
  }

  const initialState = getInitialState();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("Informação: Erro ao gravar novo arquivo local:", err.message || err);
  }
  cachedState = initialState;
  return initialState;
}

// Persist raffle state asynchronously with fallback pipeline
async function saveRaffleState(state: DatabaseState): Promise<void> {
  // Always update memory cache immediately
  cachedState = state;

  // Wait for DB initialization to complete if it's running
  if (initDbPromise) {
    try {
      await initDbPromise;
    } catch (e: any) {
      console.warn("[Database] Informação: Falha ao aguardar inicialização do DB antes de salvar:", e.message || e);
    }
  }

  let savedSuccessfully = false;

  // 1. Try direct Postgres
  if (isDbPoolActive()) {
    try {
      await dbPool!.query(
        "INSERT INTO raffle_state (id, state) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state;",
        [JSON.stringify(state)]
      );
      savedSuccessfully = true;
    } catch (err: any) {
      console.warn("[Supabase Conn] Alerta: Falha ao persistir no SQL com UPSERT. Ativando cooldown de Postgres temporário:", err.message || err);
      dbPoolLastFailureTime = Date.now();
      // Fall through to try other backends
    }
  }

  // 2. Try Supabase REST Client
  if (!savedSuccessfully && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("raffle_state")
        .upsert({ id: 1, state: JSON.stringify(state) });
      if (error) {
        console.warn("[Supabase REST] Alerta: Falha ao salvar via REST API:", error.message);
      } else {
        savedSuccessfully = true;
      }
    } catch (err: any) {
      console.warn("[Supabase REST] Alerta: Exception ao persistir no REST API:", err.message || err);
    }
  }

  // 3. Always back up/save to local file system as well for consistency in local environment
  if (!savedSuccessfully || (!process.env.VERCEL && process.env.NODE_ENV !== "production")) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (error: any) {
      console.warn("Informação: Erro ao salvar DB em arquivo local:", error.message || error);
    }
  }
}

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazily kick off DB initialization (non-blocking) and save the promise
initDbPromise = initDatabase()
  .catch(err => {
    console.error("[Database] Erro de inicialização:", err);
  }) as any;

// API ROUTES

  // Test Database Connection (Supabase / Postgres / REST API + Read-Write Test + RLS check)
  app.get("/api/raffle/db-test", async (req, res) => {
    const databaseUrl = process.env.DATABASE_URL;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!databaseUrl && (!url || !key)) {
      return res.json({
        success: false,
        mode: "local",
        message: "Nenhuma credencial do Supabase declarada nas configurações (DATABASE_URL ou SUPABASE_URL + SUPABASE_ANON_KEY). O sistema está no modo JSON local seguro."
      });
    }

    const report: any = {
      success: false,
      mode: "local",
      postgresDirect: { active: false, success: false, readOnly: false, error: null },
      supabaseRest: { active: false, success: false, readOnly: false, error: null, rlsBlocked: false }
    };

    // Direct Postgres Test
    if (databaseUrl && dbPool) {
      report.postgresDirect.active = true;
      try {
        const start = Date.now();
        // 1. Read Test
        const dbRes = await dbPool.query("SELECT state FROM raffle_state WHERE id = 1;");
        report.postgresDirect.durationMs = Date.now() - start;
        dbPoolLastFailureTime = 0; // reset cooldown override!

        const currentStateStr = dbRes.rows.length > 0 ? dbRes.rows[0].state : JSON.stringify(getInitialState());
        
        // 2. Write Test (Upsert ON CONFLICT)
        try {
          await dbPool.query(
            "INSERT INTO raffle_state (id, state) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state;",
            [currentStateStr]
          );
          report.postgresDirect.success = true;
          report.success = true;
          report.mode = "supabase";
          report.message = "Conexão direta PostgreSQL (porta 5432) funcionando 100% para Leitura e Escrita!";
          report.durationMs = report.postgresDirect.durationMs;
        } catch (writeErr: any) {
          report.postgresDirect.readOnly = true;
          report.postgresDirect.error = `Erro ao salvar/escrever no Postgres: ${writeErr.message || writeErr}`;
        }
      } catch (err: any) {
        dbPoolLastFailureTime = Date.now(); // activate cooldown
        report.postgresDirect.error = err.message || String(err);
      }
    }

    // HTTP Rest API Test
    if (supabaseClient) {
      report.supabaseRest.active = true;
      try {
        const start = Date.now();
        // 1. Read Test
        const { data, error: readError } = await supabaseClient.from("raffle_state").select("state").eq("id", 1);
        report.supabaseRest.durationMs = Date.now() - start;

        if (readError) {
          if (readError.code === "PGRST116" || readError.message?.includes("does not exist")) {
            report.supabaseRest.error = "A tabela 'raffle_state' não existe no banco de dados.";
            report.supabaseRest.needsTable = true;
          } else {
            report.supabaseRest.error = `Erro de leitura via REST API: ${readError.message}`;
            if (readError.message?.includes("row-level security") || readError.code === "42501") {
              report.supabaseRest.rlsBlocked = true;
            }
          }
        } else {
          // Select succeeded. Let's do a write check too- Postgres RLS can sometimes allow select but block writes,
          // or sometimes it blocks selects of rows created by other roles.
          const currentStateStr = (data && data.length > 0) ? (data[0].state) : JSON.stringify(getInitialState());
          const currentStateObj = typeof currentStateStr === "string" ? JSON.parse(currentStateStr) : currentStateStr;

          // 2. Write Test (Upsert)
          const { error: writeError } = await supabaseClient
            .from("raffle_state")
            .upsert({ id: 1, state: JSON.stringify(currentStateObj) });

          if (writeError) {
            report.supabaseRest.error = `Leitura OK, mas Escrita FRACASSOU via REST: ${writeError.message}`;
            report.supabaseRest.readOnly = true;
            if (writeError.message?.includes("row-level security") || writeError.code === "42501") {
              report.supabaseRest.rlsBlocked = true;
            }
          } else {
            report.supabaseRest.success = true;
            if (!report.success) {
              report.success = true;
              report.mode = "supabase";
              report.message = "Conexão via REST API do Supabase funcionando perfeitamente (Leitura e Escrita confirmadas)!";
              report.durationMs = report.supabaseRest.durationMs;
            }
          }
        }
      } catch (err: any) {
        report.supabaseRest.error = `Exception na REST API: ${err.message || err}`;
      }
    }

    // pin-point precise diagnosis:
    if (report.success) {
      return res.json({
        success: true,
        mode: report.mode,
        message: report.message,
        durationMs: report.durationMs
      });
    }

    if (report.supabaseRest.needsTable) {
      return res.json({
        success: false,
        mode: "supabase_rest_needs_table",
        message: "Conectado com o Supabase! Porém, a tabela 'raffle_state' de persistência não existe. Você precisa criá-la no editor SQL do Supabase."
      });
    }

    if (report.supabaseRest.rlsBlocked) {
      return res.json({
        success: false,
        mode: "supabase_rest_needs_table", // Triggers SQL copy card on UI
        message: "Detectamos que as políticas de segurança de linha (RLS) estão ATIVADAS no seu Supabase e bloqueando as gravações de bilhetes e configurações! Por favor, execute o comando de liberação abaixo no SQL Editor do Supabase."
      });
    }

    if (report.supabaseRest.active && report.supabaseRest.error) {
      return res.json({
        success: false,
        mode: "supabase_rest_error",
        message: `Falha na sincronização REST do Supabase: ${report.supabaseRest.error}. Certifique-se de que a tabela 'raffle_state' foi criada e está com RLS desativado.`
      });
    }

    if (report.postgresDirect.active && report.postgresDirect.error) {
      return res.json({
        success: false,
        mode: "local",
        message: `Falha ao tentar se conectar ao PostgreSQL direto (porta 5432): ${report.postgresDirect.error}. Usando fallback local temporário.`
      });
    }

    return res.json({
      success: false,
      mode: "local",
      message: "Nenhum dos canais de nuvem do Supabase pôde se comunicar no momento. Seus dados estão salvos no JSON Local temporário."
    });
  });

  // Get public raffle info: filters out PII (phones and email profiles)
  app.get("/api/raffle", async (req, res) => {
    try {
      const db = await getRaffleState();
      
      if (!db || !db.settings) {
        throw new Error("Estado do banco de dados retornado está vazio ou inválido.");
      }

      // Mask tickets phone numbers for public consumption
      const maskedTickets: Record<number, Omit<Ticket, "phone">> = {};
      if (db.tickets) {
        Object.entries(db.tickets).forEach(([num, ticket]) => {
          const n = parseInt(num);
          if (ticket) {
            maskedTickets[n] = {
              number: ticket.number,
              status: ticket.status,
              name: ticket.name,
              option: ticket.option,
              diaperSize: ticket.diaperSize,
              pixTxid: ticket.pixTxid,
              createdAt: ticket.createdAt,
              paidAt: ticket.paidAt
            };
          }
        });
      }

      res.json({
        settings: {
          title: db.settings.title,
          description: db.settings.description,
          prize: db.settings.prize,
          prizes: db.settings.prizes || (db.settings.prize ? db.settings.prize.split("|").map(p => p.trim()).filter(Boolean) : []),
          pixKey: db.settings.pixKey || "pix-chafarifa@bancocentral.com.br",
          pixKeyType: db.settings.pixKeyType || "Chave Aleatória",
          theme: db.settings.theme,
          raffleDate: db.settings.raffleDate,
          ticketPrice: db.settings.ticketPrice,
          allowDiaper: db.settings.allowDiaper,
          allowPix: db.settings.allowPix,
          diaperSizes: db.settings.diaperSizes,
          numberOfTickets: db.settings.numberOfTickets,
          isDemoKey: db.settings.adminKey === "admin123" && (!process.env.ADMIN_KEY || process.env.ADMIN_KEY === "admin123"),
          diaperRanges: db.settings.diaperRanges || [],
          pixQrCode: db.settings.pixQrCode || "",
          whatsappNumber: db.settings.whatsappNumber || "11999999999",
          pixCopyAndPaste: db.settings.pixCopyAndPaste || "",
          paymentDeadline: db.settings.paymentDeadline || "",
          howItWorks: db.settings.howItWorks || "",
          diaperObservation: db.settings.diaperObservation || ""
        },
        tickets: maskedTickets,
        drawnNumbers: db.drawnNumbers || []
      });
    } catch (routeErr: any) {
      console.error("[API_ERROR] Falha na rota /api/raffle:", routeErr);
      res.status(500).json({
        success: false,
        error: routeErr.message || String(routeErr),
        stack: routeErr.stack
      });
    }
  });

  // Verify Admin Key and return full state (with PII)
  app.get("/api/raffle/admin", async (req, res) => {
    try {
      const key = req.headers["x-admin-key"] || req.query.key;
      const db = await getRaffleState();

      if (!db || !db.settings) {
        throw new Error("Estado do banco de dados retornado está vazio ou inválido.");
      }

      if (!isValidAdminKey(key, db.settings.adminKey)) {
        return res.status(401).json({ error: "Chave de administrador inválida ou não fornecida." });
      }

      res.json(db);
    } catch (routeErr: any) {
      console.error("[API_ERROR] Falha na rota /api/raffle/admin:", routeErr);
      res.status(500).json({
        success: false,
        error: routeErr.message || String(routeErr),
        stack: routeErr.stack
      });
    }
  });

  // Reserve a number or multiple numbers
  app.post("/api/raffle/reserve", async (req, res) => {
    const { number, numbers, name, phone, option, diaperSize, diaperSizesMap } = req.body;
    
    if (!name || !phone || !option) {
      return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos (nome, telefone, opção)." });
    }

    const nums: number[] = [];
    if (numbers && Array.isArray(numbers)) {
      nums.push(...numbers.map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1));
    } else if (number) {
      nums.push(parseInt(number));
    }

    if (nums.length === 0) {
      return res.status(400).json({ error: "Nenhum número de rifa foi selecionado para reserva." });
    }

    const db = await getRaffleState();

    // Check if numbers exceed limits and availability
    for (const n of nums) {
      if (n > db.settings.numberOfTickets) {
        return res.status(400).json({ error: `O número ${n} excede o limite de ${db.settings.numberOfTickets} números da rifa.` });
      }

      const existingTicket = db.tickets[n];
      if (existingTicket && existingTicket.status !== "available") {
        return res.status(422).json({ error: `O número ${String(n).padStart(2, '0')} já foi reservado ou pago por outro participante.` });
      }
    }

    // Validate settings rules
    if (option === "diaper" && !db.settings.allowDiaper) {
      return res.status(400).json({ error: "Escolha inválida: doação de fraldas não está ativa para esta rifa." });
    }
    if (option === "pix" && !db.settings.allowPix) {
      return res.status(400).json({ error: "Escolha inválida: pagamento via Pix não está ativo para esta rifa." });
    }

    // Validate diaper size
    if (option === "diaper") {
      for (const n of nums) {
        const ticketSize = diaperSizesMap?.[n] || diaperSize;
        if (!ticketSize) {
          return res.status(400).json({ error: `Você precisa selecionar o tamanho da fralda para o número ${String(n).padStart(2, '0')}.` });
        }
      }
    }

    const pixTxid = option === "pix" ? "tx_" + Math.random().toString(16).substring(2, 10) : undefined;
    const reservedTickets: Ticket[] = [];

    nums.forEach(n => {
      const ticketSize = option === "diaper" ? (diaperSizesMap?.[n] || diaperSize) as DiaperSize : undefined;
      const newTicket: Ticket = {
        number: n,
        status: "reserved",
        name: name.trim(),
        phone: phone.trim(),
        option: option as PaymentOption,
        diaperSize: ticketSize,
        pixTxid,
        createdAt: new Date().toISOString()
      };

      db.tickets[n] = newTicket;
      reservedTickets.push(newTicket);
    });

    await saveRaffleState(db);

    res.status(201).json({
      message: nums.length > 1 ? "Prontinho! Reservas realizadas com sucesso!" : "Reserva realizada com sucesso!",
      ticket: reservedTickets[0], // backward compatibility
      tickets: reservedTickets,
      pixTxid // easy return for client checkout
    });
  });

  // Client triggers payment simulation
  app.post("/api/raffle/pix-confirm", async (req, res) => {
    const { txid } = req.body;
    if (!txid) {
      return res.status(400).json({ error: "Identificador de transação Pix (txid) é obrigatório." });
    }

    const db = await getRaffleState();
    let updated = false;

    Object.keys(db.tickets).forEach((num) => {
      const ticket = db.tickets[parseInt(num)];
      if (ticket && ticket.pixTxid === txid && ticket.status === "reserved") {
        ticket.status = "paid";
        ticket.paidAt = new Date().toISOString();
        updated = true;
      }
    });

    if (!updated) {
      return res.status(404).json({ error: "Transação Pix pendente não encontrada." });
    }

    await saveRaffleState(db);
    res.json({ message: "Pagamento Pix simulado e confirmado com sucesso!" });
  });

  // Admin: Update settings
  app.post("/api/raffle/admin/settings", async (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = await getRaffleState();

    if (!isValidAdminKey(key, db.settings.adminKey)) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const { title, description, prize, prizes, pixKey, pixKeyType, pixQrCode, whatsappNumber, pixCopyAndPaste, paymentDeadline, theme, raffleDate, ticketPrice, allowDiaper, allowPix, diaperSizes, adminKey, numberOfTickets, diaperRanges, howItWorks, diaperObservation } = req.body;

    if (title) db.settings.title = title;
    if (description !== undefined) db.settings.description = description;
    if (prize !== undefined) db.settings.prize = prize;
    if (prizes !== undefined) db.settings.prizes = prizes;
    if (pixKey !== undefined) db.settings.pixKey = pixKey;
    if (pixKeyType !== undefined) db.settings.pixKeyType = pixKeyType;
    if (pixQrCode !== undefined) db.settings.pixQrCode = pixQrCode;
    if (whatsappNumber !== undefined) db.settings.whatsappNumber = whatsappNumber;
    if (pixCopyAndPaste !== undefined) db.settings.pixCopyAndPaste = pixCopyAndPaste;
    if (paymentDeadline !== undefined) db.settings.paymentDeadline = paymentDeadline;
    if (theme) db.settings.theme = theme as ThemeType;
    if (raffleDate) db.settings.raffleDate = raffleDate;
    if (ticketPrice !== undefined) db.settings.ticketPrice = Number(ticketPrice);
    if (allowDiaper !== undefined) db.settings.allowDiaper = Boolean(allowDiaper);
    if (allowPix !== undefined) db.settings.allowPix = Boolean(allowPix);
    if (diaperSizes) db.settings.diaperSizes = diaperSizes as DiaperSize[];
    if (adminKey && adminKey.trim().length >= 3) db.settings.adminKey = adminKey.trim();
    if (diaperRanges !== undefined) db.settings.diaperRanges = diaperRanges;
    if (howItWorks !== undefined) db.settings.howItWorks = howItWorks;
    if (diaperObservation !== undefined) db.settings.diaperObservation = diaperObservation;
    
    if (numberOfTickets !== undefined) {
      const oldNum = db.settings.numberOfTickets;
      const newNum = Number(numberOfTickets);
      if (newNum >= 1 && newNum <= 500) {
        db.settings.numberOfTickets = newNum;
        
        // If truncating, clear those beyond the range
        if (newNum < oldNum) {
          Object.keys(db.tickets).forEach((numStr) => {
            const num = parseInt(numStr);
            if (num > newNum) {
              delete db.tickets[num];
            }
          });
          // filter out drawn numbers beyond bounds
          db.drawnNumbers = db.drawnNumbers.filter(n => n <= newNum);
        }
      }
    }

    await saveRaffleState(db);
    res.json({ message: "Configurações atualizadas!", settings: db.settings });
  });

  // Admin: Control ticket details / status (Set status to 'paid', 'reserved', or delete/delete releases to 'available')
  app.post("/api/raffle/admin/ticket/status", async (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = await getRaffleState();

    if (!isValidAdminKey(key, db.settings.adminKey)) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const { number, status } = req.body;
    const n = parseInt(number);
    if (isNaN(n) || n < 1 || n > db.settings.numberOfTickets) {
      return res.status(400).json({ error: "Número do bilhete inválido." });
    }

    if (status === "available" || !status) {
      delete db.tickets[n];
    } else {
      const existing: Ticket = db.tickets[n] || {
        number: n,
        status: status,
        name: "Administrador",
        phone: "-",
        option: "pix",
        createdAt: new Date().toISOString()
      };
      existing.status = status;
      if (status === "paid") {
        existing.paidAt = new Date().toISOString();
      }
      db.tickets[n] = existing;
    }

    await saveRaffleState(db);
    res.json({ message: `Bilhete ${n} atualizado para o status ${status || 'disponível'}`, tickets: db.tickets });
  });

  // Admin: Perform Draw
  app.post("/api/raffle/admin/draw", async (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = await getRaffleState();

    if (!isValidAdminKey(key, db.settings.adminKey)) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const { drawMode } = req.body; // 'paid_only' (only paid tickets can win) or 'all_chosen' (all reserved or paid) or 'all' (any ticket 1..N)
    
    let pool: number[] = [];
    if (drawMode === "paid_only") {
      pool = Object.entries(db.tickets)
        .filter(([_, t]) => t.status === "paid")
        .map(([num, _]) => parseInt(num));
    } else if (drawMode === "all_chosen") {
      pool = Object.entries(db.tickets)
        .filter(([_, t]) => t.status === "paid" || t.status === "reserved")
        .map(([num, _]) => parseInt(num));
    } else {
      // Draw from all possible numbers 1..N
      for (let i = 1; i <= db.settings.numberOfTickets; i++) {
        pool.push(i);
      }
    }

    // Exclude numbers already drawn
    pool = pool.filter(n => !db.drawnNumbers.includes(n));

    if (pool.length === 0) {
      return res.status(422).json({ error: "Não há números disponíveis para sorteio no modo selecionado." });
    }

    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winningNumber = pool[winnerIndex];

    db.drawnNumbers.push(winningNumber);
    await saveRaffleState(db);

    res.json({ 
      message: "Sorteio realizado com sucesso!",
      winningNumber,
      drawnNumbers: db.drawnNumbers
    });
  });

  // Admin: Clear Drawn List
  app.post("/api/raffle/admin/clear-draw", async (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = await getRaffleState();

    if (!isValidAdminKey(key, db.settings.adminKey)) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    db.drawnNumbers = [];
    await saveRaffleState(db);
    res.json({ message: "Histórico de sorteio limpo!", drawnNumbers: [] });
  });

  // Admin: Reset database to clean settings slate
  app.post("/api/raffle/admin/reset", async (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = await getRaffleState();

    if (!isValidAdminKey(key, db.settings.adminKey)) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const clearedDb: DatabaseState = {
      settings: {
        ...db.settings,
        adminKey: db.settings.adminKey, // preserve key
      },
      tickets: {},
      drawnNumbers: []
    };

    await saveRaffleState(clearedDb);
    res.json({ message: "Banco de rifas reiniciado com sucesso!", db: clearedDb });
  });

  // Vite Integration after our API routes (skip on Vercel as it serves static files built from dist natively)
  if (!process.env.VERCEL) {
    async function configureStaticAndListen() {
      if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            watch: {
              ignored: ["**/db-rifa.json", "**/db-rifa.json/**"]
            }
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Chá Rifa Hub] rodando com sucesso no endereço http://localhost:${PORT}`);
      });
    }
    configureStaticAndListen();
  }

  export default app;
