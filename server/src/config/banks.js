/**
 * Turkish Bank Registry — Ekstrem v1.0
 *
 * Comprehensive registry of Turkish banks that issue credit cards and send
 * e-statement (e-ekstre) emails. Contains sender email domains, subject
 * patterns, PDF attachment patterns, and parser notes for each bank.
 *
 * Research date: 2026-06-03
 * Branch: research/bank-formats
 *
 * IMPORTANT NOTES ON TURKISH REGULATORY CONTEXT:
 * - Since the BDDK (Banking Regulation and Supervision Agency) directive
 *   effective ~July 2020, banks are required to offer statements via secure
 *   digital channels (mobile/internet banking) as the PRIMARY method.
 * - E-mail delivery of statements is still offered by all major banks but
 *   requires the customer to have an active "e-ekstre talimatı" (e-statement
 *   instruction) set up.
 * - PDF password protection formats: Many state banks (Ziraat, Vakıfbank,
 *   Halkbank) and some private banks encrypt statement PDFs with the customer's
 *   11-digit T.C. Kimlik Numarası (Turkish national ID) or a portion thereof.
 */

// ---------------------------------------------------------------------------
// BANK REGISTRY
// ---------------------------------------------------------------------------

export const BANK_REGISTRY = [
  // =========================================================================
  // 1. YAPI KREDİ BANKASI
  // =========================================================================
  {
    bankId: "yapikredi",
    bankName: "Yapı ve Kredi Bankası A.Ş.",
    shortName: "Yapı Kredi",
    brandColor: "#00437A",
    senderEmails: [
      "bilgi@yapikredi.com.tr",
      "eekstre@yapikredi.com.tr",
      "hesapozeti@yapikredi.com.tr",
      "bildirim@yapikredi.com.tr",
      "noreply@yapikredi.com.tr",
    ],
    senderDomains: ["yapikredi.com.tr"],
    subjectPatterns: [
      "hesap özeti",
      "hesap ozeti",
      "e-hesap özeti",
      "e-hesap ozeti",
      "ekstre",
      "kredi kartı",
      "worldcard",
      "dönem özeti",
      "donem ozeti",
    ],
    subjectRegex: "/(hesap[\\s-]?özeti|hesap[\\s-]?ozeti|e-?ekstre|ekstre|worldcard|dönem[\\s-]?özeti)/i",
    attachmentPatterns: [
      "*.pdf",
      "HesapOzeti*.pdf",
      "Ekstre*.pdf",
      "YapiKredi*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "Worldcard",
      "World Gold",
      "World Platinum",
      "World Eko",
      "Adios",
      "Adios Premium",
      "Play",
      "Crystal",
      "Hepsiburada Premium Worldcard",
      "Opet Worldcard",
    ],
    parserNotes: [
      "Transactions listed in a multi-column table: date | merchant | amount | installment info.",
      "Installment notation format: 'X/Y Taksit' (e.g., '3/12 Taksit') where X = current installment, Y = total installments.",
      "PDF is NOT password protected — opens directly.",
      "Turkish character encoding (UTF-8); watch for İ/I confusion in merchant names.",
      "Statement period header typically contains 'HESAP ÖZETİ' in bold at top.",
      "Amounts use period as thousands separator and comma as decimal (e.g., 1.234,56 TL).",
      "Foreign currency transactions show original currency amount alongside TL equivalent.",
      "Summary box at top: dönem borcu, asgari ödeme, son ödeme tarihi.",
    ],
    confidence: "HIGH",
  },

  // =========================================================================
  // 2. GARANTİ BBVA
  // =========================================================================
  {
    bankId: "garantibbva",
    bankName: "Türkiye Garanti Bankası A.Ş.",
    shortName: "Garanti BBVA",
    brandColor: "#00A651",
    senderEmails: [
      "eekstre@garantibbva.com.tr",
      "ekstre@garantibbva.com.tr",
      "bildirim@garantibbva.com.tr",
      "bilgi@garantibbva.com.tr",
      "noreply@garantibbva.com.tr",
      "anindaekstre@garantibbva.com.tr",
    ],
    senderDomains: ["garantibbva.com.tr"],
    subjectPatterns: [
      "kredi kartı hesap özetiniz",
      "kredi karti hesap ozetiniz",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "bonus ekstre",
      "anında ekstre",
      "aninda ekstre",
      "dönem sonu",
    ],
    subjectRegex: "/(kredi kartı hesap özetiniz|hesap[\\s-]?özeti|anında ekstre|bonus ekstre|dönem sonu ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "HesapOzeti*.pdf",
      "Ekstre*.pdf",
      "GarantiEkstre*.pdf",
    ],
    pdfPasswordProtected: true,
    pdfPasswordFormat: "T.C. Kimlik Numarası (11 haneli) veya müşteri numarası",
    cardProducts: [
      "Bonus",
      "Bonus Trink",
      "Miles & Smiles",
      "Miles & Smiles Platinum",
      "Flexi",
      "Bonus Business",
      "Shop & Miles",
    ],
    parserNotes: [
      "PDF is password-protected; password is typically the 11-digit T.C. Kimlik Numarası.",
      "Statement header: 'KREDİ KARTI HESAP ÖZETİ' prominently displayed.",
      "Transactions in tabular format: tarih | açıklama | tutar columns.",
      "Bonus points earned shown in a separate column or section.",
      "Miles & Smiles variant shows airmile accruals separately.",
      "Installment notation: 'X/Y' or 'X. taksit / Y taksit' format.",
      "Amounts: 1.234,56 TL notation (period=thousands, comma=decimal).",
      "Foreign currency transactions: shows original amount + exchange rate used.",
      "PDF generated by Garanti BBVA internal system; table extraction works well with pdfplumber.",
    ],
    confidence: "HIGH",
  },

  // =========================================================================
  // 3. TÜRKİYE İŞ BANKASI (Maximum / Maximiles)
  // =========================================================================
  {
    bankId: "isbank",
    bankName: "Türkiye İş Bankası A.Ş.",
    shortName: "İş Bankası",
    brandColor: "#003087",
    senderEmails: [
      "eekstre@isbank.com.tr",
      "ekstre@isbank.com.tr",
      "bildirim@isbank.com.tr",
      "noreply@isbank.com.tr",
      "bilgi@isbank.com.tr",
      "maximum@isbank.com.tr",
    ],
    senderDomains: ["isbank.com.tr"],
    subjectPatterns: [
      "hesap özeti",
      "hesap ozeti",
      "dijital hesap özeti",
      "dijital hesap ozeti",
      "ekstre",
      "maximum ekstre",
      "maximiles ekstre",
      "kredi kartı",
    ],
    subjectRegex: "/(dijital hesap özeti|hesap[\\s-]?özeti|maximum ekstre|maximiles|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "HesapOzeti*.pdf",
      "Maximum*.pdf",
      "Maximiles*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "Maximum",
      "Maximiles",
      "Maximum Business",
      "Maximum Advantage",
      "Combo",
      "Seyahat Avantaj",
    ],
    parserNotes: [
      "As of 2020 BDDK regulations, İş Bankası primarily delivers statements via İşCep mobile app and internet banking (Belgelerim menu).",
      "E-mail delivery still active for customers with 'Dijital Hesap Özeti' preference set.",
      "PDF is NOT password protected when delivered via official channels.",
      "Transaction table columns: İşlem Tarihi | Açıklama | Yurt İçi/Dışı | Tutar.",
      "Installment notation: 'X/Y' format or 'X. Taksit (Y Taksit)' in description field.",
      "Maximum puan (reward points) shown in a dedicated summary section.",
      "Maximiles card variant shows miles earned per transaction.",
      "Amounts: Turkish locale format (1.234,56 TL).",
      "Statement may include QR code linking to mobile banking for full details.",
    ],
    confidence: "HIGH",
  },

  // =========================================================================
  // 4. AKBANK (Axess)
  // =========================================================================
  {
    bankId: "akbank",
    bankName: "Akbank T.A.Ş.",
    shortName: "Akbank",
    brandColor: "#ED1C24",
    senderEmails: [
      "ekstre@akbank.com",
      "eekstre@akbank.com",
      "bildirim@akbank.com",
      "noreply@akbank.com",
      "axess@akbank.com",
      "bilgi@akbank.com",
    ],
    senderDomains: ["akbank.com"],
    subjectPatterns: [
      "axess ekstre",
      "ekstre",
      "hesap özeti",
      "hesap ozeti",
      "kredi kartı hesap özetiniz",
      "akbank ekstre",
    ],
    subjectRegex: "/(axess ekstre|hesap[\\s-]?özeti|kredi kartı hesap özetiniz|akbank ekstre|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "Axess*.pdf",
      "AkbankEkstre*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "Axess",
      "Axess Gold",
      "Axess Platinum",
      "Axess Wings",
      "Axess Business",
      "Wings",
      "Chip-Para",
    ],
    parserNotes: [
      "Akbank uses '@akbank.com' domain (NOT akbank.com.tr) for e-statement emails.",
      "PDF is NOT password protected.",
      "Statement titled 'KREDİ KARTI HESAP ÖZETİ' at top.",
      "Installment notation: 'X/Y Taksit' in the transaction description column.",
      "Axess puan (loyalty points) earned per transaction shown in rightmost column.",
      "Wings miles variant shows THY miles earned.",
      "Transaction table: Tarih | İşyeri Adı | Taksit | Tutar columns.",
      "Foreign currency conversions listed at exchange rate footnote at bottom of statement.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "Statement typically one or two pages; complex taksit schedules may add pages.",
    ],
    confidence: "HIGH",
  },

  // =========================================================================
  // 5. QNB FİNANSBANK (CardFinans)
  // =========================================================================
  {
    bankId: "qnbfinansbank",
    bankName: "QNB Finansbank A.Ş.",
    shortName: "QNB Finansbank",
    brandColor: "#8B0000",
    senderEmails: [
      "eekstre@qnbfinansbank.com",
      "ekstre@qnbfinansbank.com",
      "cardfinans@qnbfinansbank.com",
      "bildirim@qnbfinansbank.com",
      "noreply@qnbfinansbank.com",
      "bilgi@qnbfinansbank.com",
    ],
    senderDomains: ["qnbfinansbank.com", "finansbank.com.tr"],
    subjectPatterns: [
      "cardfinans ekstre",
      "card finans ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "kredi kartı",
      "qnb finansbank",
    ],
    subjectRegex: "/(cardfinans ekstre|hesap[\\s-]?özeti|qnb finansbank|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "CardFinans*.pdf",
      "Ekstre*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "CardFinans",
      "CardFinans Platinum",
      "CardFinans Gold",
      "Pegasus BolBol",
      "Enpara Kredi Kartı",
      "QNB Business Card",
    ],
    parserNotes: [
      "QNB Finansbank rebranded from Finansbank; some older statements may show 'Finansbank' header.",
      "CardFinans brand used for consumer credit cards; domain may still show finansbank.com.tr for legacy senders.",
      "PDF is NOT password protected.",
      "Statement header shows 'HESAP ÖZETİ' with CardFinans logo.",
      "Transaction table: Tarih | Açıklama | Taksit Bilgisi | Tutar.",
      "Installment notation: 'X/Y' in the dedicated taksit column.",
      "Pegasus BolBol co-branded card shows BolBol miles alongside TL amounts.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "pdfplumber/tabula both handle this format well.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 6. ENPARA (QNB Dijital Bankacılık)
  // =========================================================================
  {
    bankId: "enpara",
    bankName: "Enpara.com (QNB Finansbank Dijital Bankacılık Platformu)",
    shortName: "Enpara",
    brandColor: "#F7941D",
    senderEmails: [
      "ekstre@enpara.com",
      "eekstre@enpara.com",
      "bildirim@enpara.com",
      "noreply@enpara.com",
      "bilgi@enpara.com",
    ],
    senderDomains: ["enpara.com"],
    subjectPatterns: [
      "enpara ekstre",
      "enpara kredi kartı",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "kredi kartı hesap özetiniz",
    ],
    subjectRegex: "/(enpara ekstre|enpara kredi kartı|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "Enpara*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "Enpara Kredi Kartı",
      "Enpara.com Kredi Kartı",
    ],
    parserNotes: [
      "Enpara is a digital-only bank operating under QNB Finansbank license.",
      "All communication uses @enpara.com domain exclusively.",
      "PDF statements are NOT password protected.",
      "Enpara has a single credit card product; statement format is simpler/cleaner than traditional banks.",
      "Statement primarily digital-first; PDF may be a generated export from the app.",
      "Transaction table: Tarih | Açıklama | Tutar columns.",
      "Installments shown in description field: 'X/Y Taksit'.",
      "Cashback amounts (Enpara nakit iade) shown separately at bottom.",
      "Amounts: Turkish locale format 1.234,56 TL.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 7. DENİZBANK (Bonus)
  // =========================================================================
  {
    bankId: "denizbank",
    bankName: "Denizbank A.Ş.",
    shortName: "Denizbank",
    brandColor: "#003087",
    senderEmails: [
      "eekstre@denizbank.com",
      "ekstre@denizbank.com",
      "bildirim@denizbank.com",
      "noreply@denizbank.com",
      "bonus@denizbank.com",
      "bilgi@denizbank.com",
    ],
    senderDomains: ["denizbank.com"],
    subjectPatterns: [
      "denizbank ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "bonus ekstre",
      "kredi kartı",
      "denizbank kredi kartı",
    ],
    subjectRegex: "/(denizbank ekstre|hesap[\\s-]?özeti|bonus ekstre|denizbank kredi kartı|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "DenizBank*.pdf",
      "Bonus*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: true,
    pdfPasswordFormat: "T.C. Kimlik Numarası (11 haneli) veya müşteri numarasının belirli haneleri",
    cardProducts: [
      "Bonus",
      "Bonus Trink",
      "Bonus Business",
      "DenizBank Asya Pasifik",
      "Çözüm Kart",
    ],
    parserNotes: [
      "Denizbank uses Bonus card program (same as Garanti BBVA Bonus — shared network).",
      "PDF is PASSWORD PROTECTED — password is typically T.C. Kimlik Numarası (11 digits).",
      "E-mail states password hint in the email body (e.g., 'TCKN'nizin ilk X hanesi').",
      "Must decrypt PDF first using pikepdf or similar before text extraction.",
      "Transaction table: İşlem Tarihi | Açıklama | Tutar | Bonus columns.",
      "Bonus points earned per transaction shown in dedicated Bonus column.",
      "Installment notation: 'X. Taksit / Y Taksit' in description.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "Statement may include advertising/promotional sections at the bottom.",
    ],
    confidence: "HIGH",
  },

  // =========================================================================
  // 8. ZİRAAT BANKASI
  // =========================================================================
  {
    bankId: "ziraat",
    bankName: "Türkiye Cumhuriyeti Ziraat Bankası A.Ş.",
    shortName: "Ziraat Bankası",
    brandColor: "#CC0000",
    senderEmails: [
      "eekstre@ziraatbank.com.tr",
      "ekstre@ziraatbank.com.tr",
      "bildirim@ziraatbank.com.tr",
      "noreply@ziraatbank.com.tr",
      "bilgi@ziraatbank.com.tr",
    ],
    senderDomains: ["ziraatbank.com.tr"],
    subjectPatterns: [
      "ziraat ekstre",
      "ziraat bankası ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "kredi kartı hesap özeti",
      "bankkart ekstre",
    ],
    subjectRegex: "/(ziraat ekstre|ziraat bankası|hesap[\\s-]?özeti|bankkart ekstre|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "Ziraat*.pdf",
      "HesapOzeti*.pdf",
      "BankkartEkstre*.pdf",
    ],
    pdfPasswordProtected: true,
    pdfPasswordFormat: "T.C. Kimlik Numarası'nın son 4 hanesi veya tam TCKN (11 hane)",
    cardProducts: [
      "Bankkart",
      "Bankkart Platinum",
      "Bankkart Gold",
      "Bankkart Classic",
      "Bankkart Combo",
      "Visa Infinite",
    ],
    parserNotes: [
      "State bank — Ziraat Bankası is Turkey's largest bank by assets.",
      "PDF is PASSWORD PROTECTED — typically last 4 digits of T.C. Kimlik Numarası or full 11-digit TCKN.",
      "Email body usually specifies the password format for the attached PDF.",
      "Bankkart brand used for all Ziraat credit/debit cards.",
      "Transaction table: Tarih | İşlem Açıklaması | Tutar | Bakiye.",
      "Installment notation: 'X/Y Taksit' in the açıklama column.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "Statement may include agricultural loan promotions — filter to credit card section only.",
      "PDF uses standard table layout; tabula extraction works with area specification.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 9. VAKIFBANK
  // =========================================================================
  {
    bankId: "vakifbank",
    bankName: "Türkiye Vakıflar Bankası T.A.O.",
    shortName: "Vakıfbank",
    brandColor: "#F7A800",
    senderEmails: [
      "eekstre@vakifbank.com.tr",
      "ekstre@vakifbank.com.tr",
      "bildirim@vakifbank.com.tr",
      "noreply@vakifbank.com.tr",
      "bilgi@vakifbank.com.tr",
    ],
    senderDomains: ["vakifbank.com.tr"],
    subjectPatterns: [
      "vakıfbank ekstre",
      "vakifbank ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "worldcard ekstre",
      "kredi kartı",
    ],
    subjectRegex: "/(vakıfbank ekstre|vakifbank ekstre|worldcard ekstre|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "VakifBank*.pdf",
      "HesapOzeti*.pdf",
      "Ekstre*.pdf",
    ],
    pdfPasswordProtected: true,
    pdfPasswordFormat: "T.C. Kimlik Numarası (11 haneli) veya müşteri numarası",
    cardProducts: [
      "World",
      "World Gold",
      "World Platinum",
      "Chip-Para",
      "Vakıf Card",
      "Miles & Smiles",
    ],
    parserNotes: [
      "State bank (majority state-owned through Vakıflar Genel Müdürlüğü).",
      "PDF is PASSWORD PROTECTED — typically T.C. Kimlik Numarası (11 digits).",
      "Vakıfbank uses World card program (shared with Yapı Kredi on the card network).",
      "Statement header: 'KREDİ KARTI HESAP ÖZETİ — VAKIFBANK'.",
      "Transaction table: Tarih | İşlem Adı | Tutar columns.",
      "Installment notation: 'X/Y' in açıklama field.",
      "WorldPoints earned shown in a dedicated section at statement footer.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "Extract text after decryption; table structure is regular.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 10. HALKBANK (Paraf)
  // =========================================================================
  {
    bankId: "halkbank",
    bankName: "Türkiye Halk Bankası A.Ş.",
    shortName: "Halkbank",
    brandColor: "#005BAA",
    senderEmails: [
      "eekstre@halkbank.com.tr",
      "ekstre@halkbank.com.tr",
      "bildirim@halkbank.com.tr",
      "paraf@halkbank.com.tr",
      "noreply@halkbank.com.tr",
      "bilgi@halkbank.com.tr",
    ],
    senderDomains: ["halkbank.com.tr"],
    subjectPatterns: [
      "halkbank ekstre",
      "paraf ekstre",
      "paraf kredi kartı",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "kredi kartı",
    ],
    subjectRegex: "/(halkbank ekstre|paraf ekstre|paraf kredi kartı|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "Halkbank*.pdf",
      "Paraf*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: true,
    pdfPasswordFormat: "T.C. Kimlik Numarası (11 haneli)",
    cardProducts: [
      "Paraf",
      "Paraf Gold",
      "Paraf Platinum",
      "Paraf Business",
      "Diners Club",
    ],
    parserNotes: [
      "State bank (majority state-owned). Paraf is the credit card brand for Halkbank.",
      "PDF is PASSWORD PROTECTED — typically T.C. Kimlik Numarası (11 digits).",
      "Some Halkbank statements deliver a link-only notification email (no PDF attachment) — users then download PDF from internet banking.",
      "Statement header: 'PARAF KREDİ KARTI HESAP ÖZETİ'.",
      "Transaction table: Tarih | Açıklama | Tutar | Paraf Puan.",
      "Installment notation: 'X. Taksit (Y Taksit)' in açıklama.",
      "Paraf puan (loyalty points) shown per transaction.",
      "Diners Club variant uses same format but with Diners branding.",
      "Amounts: Turkish locale format 1.234,56 TL.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 11. ING TÜRKİYE
  // =========================================================================
  {
    bankId: "ing",
    bankName: "ING Bank A.Ş.",
    shortName: "ING Türkiye",
    brandColor: "#FF6200",
    senderEmails: [
      "eekstre@ing.com.tr",
      "ekstre@ing.com.tr",
      "bildirim@ing.com.tr",
      "noreply@ing.com.tr",
      "bilgi@ing.com.tr",
    ],
    senderDomains: ["ing.com.tr"],
    subjectPatterns: [
      "ing ekstre",
      "ing kredi kartı",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "turuncu ekstre",
      "ing bonus",
    ],
    subjectRegex: "/(ing ekstre|ing kredi kartı|turuncu ekstre|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "ING*.pdf",
      "HesapOzeti*.pdf",
      "INGEkstre*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "ING Bonus Card",
      "ING Pegasus BolBol",
      "ING Turuncu Kredi Kartı",
    ],
    parserNotes: [
      "ING uses @ing.com.tr domain (confirmed official domain for Turkey operations).",
      "PDF is NOT password protected.",
      "Statement header shows ING orange branding.",
      "Transaction table: Tarih | İşyeri | Tutar | Bonus/BolBol.",
      "Bonus Card shows Bonus puan per transaction.",
      "Pegasus BolBol card shows BolBol miles earned.",
      "Turuncu Ekstra cashback shown in summary section.",
      "Installment notation: 'X/Y Taksit' in açıklama field.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "Clean PDF structure — good for automated extraction.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 12. HSBC TÜRKİYE
  // =========================================================================
  {
    bankId: "hsbc",
    bankName: "HSBC Bank A.Ş.",
    shortName: "HSBC Türkiye",
    brandColor: "#DB0011",
    senderEmails: [
      "eekstre@hsbc.com.tr",
      "ekstre@hsbc.com.tr",
      "bildirim@hsbc.com.tr",
      "noreply@hsbc.com.tr",
      "bilgi@hsbc.com.tr",
      "creditcard@hsbc.com.tr",
    ],
    senderDomains: ["hsbc.com.tr"],
    subjectPatterns: [
      "hsbc ekstre",
      "hsbc kredi kartı",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "advance ekstre",
      "premier ekstre",
    ],
    subjectRegex: "/(hsbc ekstre|hsbc kredi kartı|advance ekstre|premier ekstre|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "HSBC*.pdf",
      "HesapOzeti*.pdf",
      "HSBCEkstre*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "HSBC Advantage",
      "HSBC Advance",
      "HSBC Premier",
      "HSBC Classic",
      "HSBC Business",
    ],
    parserNotes: [
      "HSBC Türkiye uses @hsbc.com.tr domain.",
      "PDF is NOT password protected.",
      "Statement offers past 24 months of statements via phone banking (0850 211 0 111).",
      "Statement header: 'KREDİ KARTI HESAP ÖZETİ — HSBC'.",
      "Transaction table: Tarih | Açıklama | Taksit | Tutar columns.",
      "Advance and Premier variants may have additional benefit summaries.",
      "Installment notation: 'X/Y' in taksit column.",
      "Foreign currency handling: original currency + TL equivalent shown.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "HSBC Türkiye has been reducing retail operations — some card products discontinued.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 13. TEB (TÜRK EKONOMİ BANKASI)
  // =========================================================================
  {
    bankId: "teb",
    bankName: "Türk Ekonomi Bankası A.Ş.",
    shortName: "TEB",
    brandColor: "#003087",
    senderEmails: [
      "eekstre@teb.com.tr",
      "ekstre@teb.com.tr",
      "bildirim@teb.com.tr",
      "noreply@teb.com.tr",
      "bilgi@teb.com.tr",
      "dijitalekstre@teb.com.tr",
    ],
    senderDomains: ["teb.com.tr"],
    subjectPatterns: [
      "teb ekstre",
      "teb kredi kartı",
      "dijital ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "bonus ekstre",
      "cepteteb ekstre",
    ],
    subjectRegex: "/(teb ekstre|teb kredi kartı|dijital ekstre|cepteteb|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "TEB*.pdf",
      "HesapOzeti*.pdf",
      "TEBEkstre*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "TEB Bonus",
      "TEB Bonus Business",
      "TEB Extra",
      "TEB Optimum",
      "Miles & Smiles TEB",
    ],
    parserNotes: [
      "TEB (Türk Ekonomi Bankası) is majority-owned by BNP Paribas group.",
      "Digital ekstre (Dijital Ekstre) is the primary channel — accessible via CEPTETEB app.",
      "PDF export button available in CEPTETEB Mobil and internet banking.",
      "PDF is NOT password protected.",
      "Statement header: 'KREDİ KARTI HESAP EKSTRESİ'.",
      "Transaction table: Tarih | Açıklama | Tutar | Taksit Bilgisi.",
      "TEB Bonus shows Bonus puan per transaction.",
      "Installment notation: 'X/Y Taksit' in the taksit bilgisi column.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "PDF from CEPTETEB exports cleanly; tabula or pdfplumber both work.",
    ],
    confidence: "MEDIUM",
  },

  // =========================================================================
  // 14. ŞEKERBANK
  // =========================================================================
  {
    bankId: "sekerbank",
    bankName: "Şekerbank T.A.Ş.",
    shortName: "Şekerbank",
    brandColor: "#E31E24",
    senderEmails: [
      "eekstre@sekerbank.com.tr",
      "ekstre@sekerbank.com.tr",
      "bildirim@sekerbank.com.tr",
      "noreply@sekerbank.com.tr",
      "bilgi@sekerbank.com.tr",
    ],
    senderDomains: ["sekerbank.com.tr"],
    subjectPatterns: [
      "şekerbank ekstre",
      "sekerbank ekstre",
      "şeker bonus ekstre",
      "seker bonus ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "kredi kartı",
    ],
    subjectRegex: "/(şekerbank ekstre|sekerbank ekstre|şeker bonus|seker bonus|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "Sekerbank*.pdf",
      "SekerBonus*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "Şeker Bonus",
      "Şeker Bonus Gold",
      "Şeker Bonus Platinum",
      "Şeker Kart",
    ],
    parserNotes: [
      "Şekerbank is a mid-size Turkish bank focused on SMEs and agricultural sector.",
      "E-ekstre delivered via: Şekerbank Mobil > Tüm İşlemler > Kartlar > Ekstre Talimatı.",
      "PDF is NOT password protected.",
      "Şeker Bonus card uses Bonus puan loyalty program.",
      "Statement header: 'KREDİ KARTI HESAP ÖZETİ — ŞEKERBANK'.",
      "Transaction table: Tarih | Açıklama | Tutar | Bonus columns.",
      "Installment notation: 'X/Y' in açıklama field.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "PDF structure may vary — simpler layout than tier-1 banks.",
      "Limited developer community documentation available for this bank's format.",
    ],
    confidence: "LOW",
  },

  // =========================================================================
  // 15. ODEABANK
  // =========================================================================
  {
    bankId: "odeabank",
    bankName: "Odea Bank A.Ş.",
    shortName: "Odeabank",
    brandColor: "#00A3E0",
    senderEmails: [
      "eekstre@odeabank.com",
      "ekstre@odeabank.com",
      "bildirim@odeabank.com",
      "noreply@odeabank.com",
      "bilgi@odeabank.com",
    ],
    senderDomains: ["odeabank.com"],
    subjectPatterns: [
      "odeabank ekstre",
      "bank'o ekstre",
      "banko ekstre",
      "hesap özeti",
      "hesap ozeti",
      "ekstre",
      "kredi kartı",
    ],
    subjectRegex: "/(odeabank ekstre|bank'?o ekstre|hesap[\\s-]?özeti|ekstre)/i",
    attachmentPatterns: [
      "*.pdf",
      "Odea*.pdf",
      "BankO*.pdf",
      "HesapOzeti*.pdf",
    ],
    pdfPasswordProtected: false,
    pdfPasswordFormat: null,
    cardProducts: [
      "Bank'O Card",
      "Bank'O Card Platinum",
      "Bank'O Card Gold",
      "Bank'O Business",
    ],
    parserNotes: [
      "Odeabank is the Turkish subsidiary of Bank Audi (Lebanon).",
      "Bank'O Card is the primary credit card product (note apostrophe in name).",
      "Contact: 444 8 444 for e-ekstre setup.",
      "E-ekstre preference set via: Odea Mobil > Sana Özel > Ayarlar > Bildirim Ayarları.",
      "PDF is NOT password protected.",
      "Statement header: 'KREDİ KARTI HESAP ÖZETİ — ODEABANK'.",
      "Transaction table: Tarih | Açıklama | Tutar columns.",
      "Installment notation: 'X/Y Taksit' in açıklama.",
      "Physical mail statement delivery is FEE-BASED — customers incentivized to use e-ekstre.",
      "Amounts: Turkish locale format 1.234,56 TL.",
      "Limited public developer documentation; treat as similar format to other mid-size banks.",
    ],
    confidence: "LOW",
  },
];

// ---------------------------------------------------------------------------
// SENDER EMAIL → BANK ID LOOKUP MAP
// ---------------------------------------------------------------------------

/**
 * Quick lookup map from sender email address to bankId.
 * Covers all known/confirmed sender addresses across all 15 banks.
 * For domain-based matching, use the senderDomains array on each bank entry.
 */
export const SENDER_TO_BANK = Object.fromEntries(
  BANK_REGISTRY.flatMap((bank) =>
    bank.senderEmails.map((email) => [email.toLowerCase(), bank.bankId])
  )
);

// ---------------------------------------------------------------------------
// DOMAIN → BANK ID LOOKUP MAP
// ---------------------------------------------------------------------------

/**
 * Maps email sending domains (e.g., "yapikredi.com.tr") to bankId.
 * Use when exact sender email is unknown but domain is parseable.
 */
export const DOMAIN_TO_BANK = Object.fromEntries(
  BANK_REGISTRY.flatMap((bank) =>
    (bank.senderDomains || []).map((domain) => [domain.toLowerCase(), bank.bankId])
  )
);

// ---------------------------------------------------------------------------
// BANK ID → BANK REGISTRY ENTRY MAP
// ---------------------------------------------------------------------------

export const BANK_BY_ID = Object.fromEntries(
  BANK_REGISTRY.map((bank) => [bank.bankId, bank])
);

// ---------------------------------------------------------------------------
// DETECTION FUNCTION
// ---------------------------------------------------------------------------

/**
 * Detect which Turkish bank sent a credit card statement email.
 *
 * Detection priority (most → least reliable):
 *   1. Exact sender email match
 *   2. Sender email domain match
 *   3. Subject line keyword match (per bank's subjectPatterns)
 *
 * @param {string} senderEmail - The From address of the email
 * @param {string} subject     - The Subject line of the email
 * @returns {{ bankId: string|null, confidence: "HIGH"|"MEDIUM"|"LOW"|"NONE", method: string }}
 */
export function detectBankFromEmail(senderEmail, subject) {
  const lowerSender = (senderEmail || "").toLowerCase().trim();
  const lowerSubject = (subject || "").toLowerCase().trim();

  // ── Priority 1: Exact sender email match ─────────────────────────────────
  if (lowerSender && SENDER_TO_BANK[lowerSender]) {
    return {
      bankId: SENDER_TO_BANK[lowerSender],
      confidence: "HIGH",
      method: "exact_sender_email",
    };
  }

  // ── Priority 2: Sender email domain match ────────────────────────────────
  if (lowerSender) {
    const atIndex = lowerSender.indexOf("@");
    if (atIndex !== -1) {
      const domain = lowerSender.slice(atIndex + 1);
      if (DOMAIN_TO_BANK[domain]) {
        return {
          bankId: DOMAIN_TO_BANK[domain],
          confidence: "HIGH",
          method: "sender_domain",
        };
      }
    }
  }

  // ── Priority 3: Subject line pattern match ───────────────────────────────
  if (lowerSubject) {
    for (const bank of BANK_REGISTRY) {
      const matched = bank.subjectPatterns.some((pattern) =>
        lowerSubject.includes(pattern.toLowerCase())
      );
      if (matched) {
        return {
          bankId: bank.bankId,
          confidence: "MEDIUM",
          method: "subject_pattern",
        };
      }
    }
  }

  // ── No match ─────────────────────────────────────────────────────────────
  return {
    bankId: null,
    confidence: "NONE",
    method: "no_match",
  };
}

// ---------------------------------------------------------------------------
// UTILITY: Is this a credit card statement email? (vs. promotional/other)
// ---------------------------------------------------------------------------

/**
 * Determines whether a given email subject looks like a credit card
 * statement (ekstre) rather than a promotional or generic notification.
 *
 * @param {string} subject - Email subject line
 * @returns {boolean}
 */
export function isCreditCardStatement(subject) {
  const STATEMENT_KEYWORDS = [
    "ekstre",
    "hesap özeti",
    "hesap ozeti",
    "e-hesap özeti",
    "e-hesap ozeti",
    "dönem özeti",
    "donem ozeti",
    "hesap özetiniz",
    "hesap ozetiniz",
    "kredi kartı hesap",
    "kredi karti hesap",
  ];

  const EXCLUSION_KEYWORDS = [
    "kampanya",
    "fırsat",
    "firsat",
    "teklif",
    "indirim",
    "promosyon",
    "çekiliş",
    "çekilis",
    "hediye",
    "kazandı",
    "kazandi",
  ];

  const lower = (subject || "").toLowerCase();

  const hasStatementKeyword = STATEMENT_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );
  const hasExclusionKeyword = EXCLUSION_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );

  return hasStatementKeyword && !hasExclusionKeyword;
}

// ---------------------------------------------------------------------------
// UTILITY: Get PDF password hint for a bank
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable password hint for encrypted statement PDFs.
 *
 * @param {string} bankId
 * @returns {{ isEncrypted: boolean, hint: string|null }}
 */
export function getPdfPasswordHint(bankId) {
  const bank = BANK_BY_ID[bankId];
  if (!bank) {
    return { isEncrypted: false, hint: null };
  }
  return {
    isEncrypted: bank.pdfPasswordProtected,
    hint: bank.pdfPasswordFormat || null,
  };
}
