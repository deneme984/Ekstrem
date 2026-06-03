# 🏦 Turkish Bank Registry — Research Notes

**Research Date:** 2026-06-03  
**Branch:** `research/bank-formats`  
**Researcher:** Bank Research Analyst Agent (Ekstrem 1.0.0)  
**Output file:** `server/src/config/banks.js`

---

## Executive Summary

Researched all 15 Turkish banks specified in the task. Key findings:

- **Sender email domains** are the most reliable identification method — all banks use their official `.com.tr` or `.com` domains exclusively.
- **Exact sender local-parts** (e.g., `ekstre@`, `eekstre@`, `bildirim@`) vary by bank and could not all be confirmed with hard evidence — these are derived from domain patterns and Turkish forum/user reports.
- **PDF password protection** is used by: Garanti BBVA, Denizbank, Ziraat Bankası, Vakıfbank, Halkbank (all typically use T.C. Kimlik Numarası / TCKN).
- **BDDK regulation ~July 2020** shifted primary statement delivery to mobile/internet banking apps; e-mail delivery continues but requires opt-in "e-ekstre talimatı."
- **Installment notation** is consistent across banks: `X/Y Taksit` format (X = current, Y = total).
- **Amount format** is consistent: Turkish locale `1.234,56 TL` (period = thousands separator, comma = decimal).

---

## Confidence Levels per Bank

| # | Bank | bankId | Email Domain Confidence | PDF Format Confidence | Overall |
|---|------|--------|------------------------|----------------------|---------|
| 1 | Yapı Kredi | `yapikredi` | HIGH | HIGH (not encrypted) | **HIGH** |
| 2 | Garanti BBVA | `garantibbva` | HIGH | HIGH (TCKN encrypted) | **HIGH** |
| 3 | İş Bankası | `isbank` | HIGH | HIGH (not encrypted) | **HIGH** |
| 4 | Akbank | `akbank` | HIGH | HIGH (not encrypted) | **HIGH** |
| 5 | QNB Finansbank | `qnbfinansbank` | MEDIUM | MEDIUM | **MEDIUM** |
| 6 | Enpara | `enpara` | MEDIUM | MEDIUM | **MEDIUM** |
| 7 | Denizbank | `denizbank` | HIGH | HIGH (TCKN encrypted) | **HIGH** |
| 8 | Ziraat Bankası | `ziraat` | MEDIUM | MEDIUM (TCKN encrypted) | **MEDIUM** |
| 9 | Vakıfbank | `vakifbank` | MEDIUM | MEDIUM (TCKN encrypted) | **MEDIUM** |
| 10 | Halkbank | `halkbank` | MEDIUM | MEDIUM (TCKN encrypted) | **MEDIUM** |
| 11 | ING Türkiye | `ing` | MEDIUM | MEDIUM | **MEDIUM** |
| 12 | HSBC Türkiye | `hsbc` | MEDIUM | MEDIUM | **MEDIUM** |
| 13 | TEB | `teb` | MEDIUM | MEDIUM | **MEDIUM** |
| 14 | Şekerbank | `sekerbank` | LOW | LOW | **LOW** |
| 15 | Odeabank | `odeabank` | LOW | LOW | **LOW** |

---

## Bank-by-Bank Research Details

### 1. Yapı Kredi Bankası (yapikredi)
- **Domain:** `yapikredi.com.tr` — confirmed official
- **Historical note:** YKB is sometimes used as abbreviation internally but `yapikredi.com.tr` is the email domain
- **PDF:** NOT password protected — opens directly
- **Card products:** Worldcard ecosystem (no Miles&Smiles — that's Garanti BBVA branded)
- **Source quality:** Bank website + multiple user reports
- **Flagged unknowns:** Exact local-part of sender (e.g., `eekstre@` vs `ekstre@`) not confirmed via hard evidence

### 2. Garanti BBVA (garantibbva)
- **Domain:** `garantibbva.com.tr` — confirmed
- **Important:** `ekstre@garantibbva.com.tr` was found flagged by abuse.ch as a **phishing/spoofed** address used in malware campaigns — this suggests the real bank address IS similar and it gets spoofed. Include with caution.
- **PDF:** Password protected, typically full TCKN (11 digits)
- **Card products:** Bonus, Miles&Smiles (joint with THY), Flexi, Shop&Miles
- **Source quality:** Bank website + abuse.ch report (confirms domain legitimacy)

### 3. İş Bankası / Maximum (isbank)
- **Domain:** `isbank.com.tr` — confirmed
- **Key regulatory change:** İş Bankası explicitly stopped sending financial data via email per BDDK rules (2020+). Statements now primary via İşCep/İnternet Şubesi > Belgelerim
- **PDF:** NOT password protected when obtained via official channels
- **Card products:** Maximum, Maximiles brands
- **Source quality:** Bank official FAQ page confirms digital-only shift

### 4. Akbank / Axess (akbank)
- **Domain:** `akbank.com` (NOT `.com.tr`) — important distinction
- **PDF:** NOT password protected  
- **Installments:** `X/Y Taksit` confirmed from user reports and format documentation
- **Card products:** Axess family, Wings (THY co-brand), Chip-Para
- **Source quality:** Bank website security page + Hürriyet article

### 5. QNB Finansbank / CardFinans (qnbfinansbank)
- **Domain:** `qnbfinansbank.com` (rebranded from `finansbank.com.tr`)
- **Note:** Legacy senders may still use `finansbank.com.tr` — both domains included
- **PDF:** NOT password protected
- **Card products:** CardFinans, Pegasus BolBol
- **Source quality:** Bank website + QNB mobile app documentation

### 6. Enpara (enpara)
- **Domain:** `enpara.com` — distinct from parent QNB Finansbank
- **Note:** Enpara is a digital-only brand/sub-bank under QNB Finansbank license. Uses completely separate branding and email domain.
- **PDF:** NOT password protected
- **Card products:** Single "Enpara Kredi Kartı" product with cashback
- **Source quality:** Enpara website + user forum mentions

### 7. Denizbank / Bonus (denizbank)
- **Domain:** `denizbank.com` — confirmed
- **PDF:** PASSWORD PROTECTED — TCKN typically
- **Note:** Denizbank uses the Bonus puan loyalty program (same network as Garanti BBVA Bonus — interoperable)
- **Ownership:** Denizbank acquired by Emirates NBD in 2019
- **Source quality:** Multiple user forum posts confirm PDF encryption + TCKN password

### 8. Ziraat Bankası (ziraat)
- **Domain:** `ziraatbank.com.tr` — official
- **PDF:** PASSWORD PROTECTED — "last 4 digits of TCKN" or "full TCKN" reported by users
- **Note:** Turkey's largest bank by assets; state-owned
- **Card products:** Bankkart brand exclusively
- **Source quality:** Multiple user forum reports + bank FAQ pages

### 9. Vakıfbank (vakifbank)
- **Domain:** `vakifbank.com.tr` — official
- **PDF:** PASSWORD PROTECTED — TCKN format
- **Note:** Majority state-owned (Vakıflar Genel Müdürlüğü). Uses World card network (different from Yapı Kredi's Worldcard brand despite similar name)
- **Card products:** World card family, Chip-Para, Miles&Smiles
- **Source quality:** Bank website navigation instructions

### 10. Halkbank / Paraf (halkbank)
- **Domain:** `halkbank.com.tr` — official
- **PDF:** PASSWORD PROTECTED — TCKN
- **Note:** Some customers report receiving link-only notifications (no PDF attachment) directing to internet banking download
- **Card products:** Paraf brand, Diners Club franchise
- **Source quality:** Bank website (e-ekstre instructions) + user reports

### 11. ING Türkiye (ing)
- **Domain:** `ing.com.tr` — confirmed from security page and multiple references
- **Note:** ING lists `some@ing.com.tr` as phishing reporting address, confirming `@ing.com.tr` is the active domain
- **PDF:** NOT password protected
- **Card products:** ING Bonus Card, Pegasus BolBol, Turuncu Kredi Kartı
- **Brand color:** ING Orange `#FF6200` — well documented across multiple brand resources
- **Source quality:** Bank website + brand color databases (consistent)

### 12. HSBC Türkiye (hsbc)
- **Domain:** `hsbc.com.tr` — official Turkey subsidiary domain
- **PDF:** NOT password protected
- **Note:** HSBC Turkey has been reducing retail footprint; some legacy products discontinued
- **Card products:** Advance, Premier, Classic families
- **Past 24 months** of statements accessible via phone banking (0850 211 0 111)
- **Source quality:** Bank website + phone banking menu documentation

### 13. TEB / Türk Ekonomi Bankası (teb)
- **Domain:** `teb.com.tr` — official
- **PDF:** NOT password protected
- **Note:** TEB is 50% owned by BNP Paribas. CEPTETEB is the mobile banking app brand.
- **Card products:** TEB Bonus (uses Garanti BBVA Bonus network), TEB Extra, Optimum
- **Source quality:** TEB official website + cepteteb.com.tr documentation

### 14. Şekerbank (sekerbank)
- **Domain:** `sekerbank.com.tr` — official
- **PDF:** NOT password protected (assumed — no contradictory reports found)
- **Note:** Şekerbank is focused on SME and agricultural lending. Retail credit card portfolio smaller than tier-1 banks.
- **Card products:** Şeker Bonus (uses Bonus puan network)
- **E-ekstre setup:** Via Şekerbank Mobil > Tüm İşlemler > Kartlar > Ekstre Talimatı
- **Confidence: LOW** — very limited developer/user forum documentation; extrapolated from bank website
- **Source quality:** Bank website (e-ekstre instructions only)

### 15. Odeabank (odeabank)
- **Domain:** `odeabank.com` — confirmed (not `.com.tr`)
- **PDF:** NOT password protected
- **Note:** Bank'O Card is their primary product. Physical mail statements are fee-based, creating strong incentive for digital e-ekstre adoption.
- **Card products:** Bank'O Card family (note apostrophe in name — important for regex)
- **Ownership:** Subsidiary of Bank Audi (Lebanon)
- **Confidence: LOW** — limited user documentation; bank is smaller/niche
- **Source quality:** Bank website (limited) + app documentation

---

## Key Technical Findings

### PDF Password Protection Pattern
Banks with encrypted PDFs use **T.C. Kimlik Numarası (TCKN)** as password:
- Format is 11 digits (Turkish national ID)
- Some use partial TCKN (last 4 digits): particularly Ziraat Bankası variations
- The email body ALWAYS mentions the password format — parse email body for hint

### Banks with Encrypted PDFs:
1. Garanti BBVA ✓
2. Denizbank ✓
3. Ziraat Bankası ✓
4. Vakıfbank ✓
5. Halkbank ✓

### Banks with Unencrypted PDFs:
All others (Yapı Kredi, Akbank, İş Bankası, QNB Finansbank, Enpara, ING, HSBC, TEB, Şekerbank, Odeabank)

### Amount Format (Universal)
All Turkish banks use the same locale format:
- `1.234,56 TL` — period as thousands separator, comma as decimal
- No exceptions found in research

### Installment Notation (Near-Universal)
- `X/Y Taksit` — most common (e.g., "3/12 Taksit")
- `X. Taksit (Y Taksit)` — variant used by some banks (e.g., Halkbank)
- `X/Y` — minimal form in table cells

---

## Gaps & Flags for Manual Verification

### 🚩 Banks Needing Real Email Sample Verification
The following banks have LOW confidence on exact sender email local-parts. Domain matching will work, but specific `ekstre@`, `bildirim@`, etc. addresses need real email samples to confirm:

1. **Şekerbank** — very little public forum data
2. **Odeabank** — limited user reports
3. **QNB Finansbank** — transition from Finansbank branding creates ambiguity
4. **Ziraat Bankası** — state bank systems may use non-obvious sender addresses

### 🚩 Regulatory Caveat
Due to the BDDK 2020 regulation, some banks may send **link-only** notification emails (no PDF attachment) directing users to download statements from the banking app. In this case:
- The email itself won't have a PDF to parse
- The app/portal download will produce the actual PDF
- Halkbank has this behavior for some customers

### 🚩 Garanti BBVA Bonus Domain Spoofing
The address `ekstre@garantibbva.com.tr` has been used in phishing campaigns (documented by abuse.ch). This means:
- The real bank does use similar addresses on `garantibbva.com.tr`
- Verification of a PDF's authenticity should go beyond just sender email
- Look for DKIM/SPF pass headers as additional signal

---

## Sources Used

| Bank | Primary Sources |
|------|----------------|
| Yapı Kredi | yapikredi.com.tr official site, security pages, user forums |
| Garanti BBVA | garantibbva.com.tr, abuse.ch phishing report, Şikayetvar |
| İş Bankası | isbank.com.tr FAQ (BDDK compliance note), İşCep docs |
| Akbank | akbank.com security page, Hürriyet.com.tr article, user forums |
| QNB Finansbank | qnb.com.tr, CardFinans product pages |
| Enpara | enpara.com official site |
| Denizbank | denizbank.com, user forum threads (PDF password confirmation) |
| Ziraat Bankası | ziraatbank.com.tr, user forum reports (PDF password) |
| Vakıfbank | vakifbank.com.tr instructions, user navigation guides |
| Halkbank | halkbank.com.tr e-ekstre instructions, user reports |
| ING Türkiye | ing.com.tr, brand color databases, security reporting page |
| HSBC Türkiye | hsbc.com.tr, phone banking menu documentation |
| TEB | teb.com.tr, cepteteb.com.tr documentation, Şikayetvar |
| Şekerbank | sekerbank.com.tr e-ekstre instructions |
| Odeabank | odeabank.com, app documentation, fee schedule |
| General | BDDK regulation (2020), Turkish developer forum (GitHub search results), bankstatementparser research |
