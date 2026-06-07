import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DatabaseState, Ticket, RaffleSettings, ThemeType, DiaperSize, PaymentOption } from "./src/types.js";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db-rifa.json");

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
      adminKey: "admin123", // Easy default key
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

// Read database from file system
function readDB(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db: DatabaseState = JSON.parse(data);
      // Auto-migrate database with diaperRanges if not present
      if (!db.settings.diaperRanges) {
        db.settings.diaperRanges = [
          { from: 1, to: 15, size: "P" },
          { from: 16, to: 45, size: "M" },
          { from: 46, to: 80, size: "G" },
          { from: 81, to: 100, size: "GG" }
        ];
        writeDB(db);
      }
      // Auto-migrate database with prizes if not present
      if (!db.settings.prizes) {
        if (db.settings.prize) {
          db.settings.prizes = db.settings.prize.split("|").map(p => p.trim()).filter(Boolean);
        } else {
          db.settings.prizes = ["1º Prêmio: Fritadeira Elétrica Airfryer Philips Walita"];
        }
        writeDB(db);
      }
      // Auto-migrate database with default Pix keys if not present
      if (!db.settings.pixKey) {
        db.settings.pixKey = "pix-chafarifa@bancocentral.com.br";
        db.settings.pixKeyType = "Chave Aleatória";
        writeDB(db);
      }
      if (!db.settings.whatsappNumber) {
        db.settings.whatsappNumber = "11999999999";
        writeDB(db);
      }
      if (db.settings.pixCopyAndPaste === undefined) {
        db.settings.pixCopyAndPaste = "";
        writeDB(db);
      }
      if (db.settings.paymentDeadline === undefined) {
        const defaultDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].split('-').reverse().join('/');
        db.settings.paymentDeadline = defaultDeadline;
        writeDB(db);
      }

      // Auto-migrate XP diaper sizes and range sizes to RN
      let dirty = false;
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
        writeDB(db);
      }

      return db;
    }
  } catch (error) {
    console.error("Erro ao ler DB, usando estado inicial:", error);
  }
  const initialState = getInitialState();
  writeDB(initialState);
  return initialState;
}

// Write database to file system
function writeDB(state: DatabaseState): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao salvar DB:", error);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Initialize DB on server start
  readDB();

  // API ROUTES

  // Get public raffle info: filters out PII (phones and email profiles)
  app.get("/api/raffle", (req, res) => {
    const db = readDB();
    
    // Mask tickets phone numbers for public consumption
    const maskedTickets: Record<number, Omit<Ticket, "phone">> = {};
    Object.entries(db.tickets).forEach(([num, ticket]) => {
      const n = parseInt(num);
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
    });

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
        isDemoKey: db.settings.adminKey === "admin123",
        diaperRanges: db.settings.diaperRanges || [],
        pixQrCode: db.settings.pixQrCode || "",
        whatsappNumber: db.settings.whatsappNumber || "11999999999",
        pixCopyAndPaste: db.settings.pixCopyAndPaste || "",
        paymentDeadline: db.settings.paymentDeadline || "",
        howItWorks: db.settings.howItWorks || "",
        diaperObservation: db.settings.diaperObservation || ""
      },
      tickets: maskedTickets,
      drawnNumbers: db.drawnNumbers
    });
  });

  // Verify Admin Key and return full state (with PII)
  app.get("/api/raffle/admin", (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = readDB();

    if (!key || key !== db.settings.adminKey) {
      return res.status(401).json({ error: "Chave de administrador inválida ou não fornecida." });
    }

    res.json(db);
  });

  // Reserve a number or multiple numbers
  app.post("/api/raffle/reserve", (req, res) => {
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

    const db = readDB();

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

    writeDB(db);

    res.status(201).json({
      message: nums.length > 1 ? "Prontinho! Reservas realizadas com sucesso!" : "Reserva realizada com sucesso!",
      ticket: reservedTickets[0], // backward compatibility
      tickets: reservedTickets,
      pixTxid // easy return for client checkout
    });
  });

  // Client triggers payment simulation
  app.post("/api/raffle/pix-confirm", (req, res) => {
    const { txid } = req.body;
    if (!txid) {
      return res.status(400).json({ error: "Identificador de transação Pix (txid) é obrigatório." });
    }

    const db = readDB();
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

    writeDB(db);
    res.json({ message: "Pagamento Pix simulado e confirmado com sucesso!" });
  });

  // Admin: Update settings
  app.post("/api/raffle/admin/settings", (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = readDB();

    if (!key || key !== db.settings.adminKey) {
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

    writeDB(db);
    res.json({ message: "Configurações atualizadas!", settings: db.settings });
  });

  // Admin: Control ticket details / status (Set status to 'paid', 'reserved', or delete/delete releases to 'available')
  app.post("/api/raffle/admin/ticket/status", (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = readDB();

    if (!key || key !== db.settings.adminKey) {
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

    writeDB(db);
    res.json({ message: `Bilhete ${n} atualizado para o status ${status || 'disponível'}`, tickets: db.tickets });
  });

  // Admin: Perform Draw
  app.post("/api/raffle/admin/draw", (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = readDB();

    if (!key || key !== db.settings.adminKey) {
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
    writeDB(db);

    res.json({ 
      message: "Sorteio realizado com sucesso!",
      winningNumber,
      drawnNumbers: db.drawnNumbers
    });
  });

  // Admin: Clear Drawn List
  app.post("/api/raffle/admin/clear-draw", (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = readDB();

    if (!key || key !== db.settings.adminKey) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    db.drawnNumbers = [];
    writeDB(db);
    res.json({ message: "Histórico de sorteio limpo!", drawnNumbers: [] });
  });

  // Admin: Reset database to clean settings slate
  app.post("/api/raffle/admin/reset", (req, res) => {
    const key = req.headers["x-admin-key"] || req.query.key;
    const db = readDB();

    if (!key || key !== db.settings.adminKey) {
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

    writeDB(clearedDb);
    res.json({ message: "Banco de rifas reiniciado com sucesso!", db: clearedDb });
  });

  // Vite Integration after our API routes
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer();
