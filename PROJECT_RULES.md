# VERITAS // CORPUS — ARXİTEKTURA, DİZAYN VƏ MÜHƏNDİSLİK QAYDALARI (PROJECT RULES)

> **Status:** KİLİDLƏNMİŞ VƏ MƏCBURİDİR (LOCKED & MANDATORY)  
> **Versiya:** 1.0.0-PROD  
> **Layihə ID:** `projects/832500263604369914` (Google Stitch Ref)  
> **Təyinat:** Vizual İstinadlı Deep Research AI Platforması (NotebookLM + Perplexity Hibridi)

---

## 1. QƏTİ ANTI-AI DİZAYN MANİFESTİ (SWISS GRID ENGINEERING)

VERITAS platforması heç bir "AI bəzəyi", ümumi şablon və ya qeyri-ciddi vizual effekt daşımayan, kritik elmi-tədqiqat və mühəndislik alətidir.

### 1.1 Qadağan Edilən Elementlər (Zero Tolerance)
1. **Neon qradiyentlər:** Bənövşəyi-çəhrayı, göy-bənövşəyi ("AI glow") və parıldayan borderlər qəti qadağandır.
2. **Glassmorphism:** `backdrop-blur-*`, şəffaf şüşə kartlar və qeyri-müəyyən təbəqələr yoxdur.
3. **Drop-Shadow:** Bütün komponentlər və panellər xam, kəskin 1px hairline sərhədlərlə ayrılır. Yeganə istisna sağdakı real kağız vərəqinin (#F8F7F4) arxasındakı təbii kağız kölgəsidir (`shadow-2xl`).
4. **Pulsasiya / Animasiya təlxəkliyi:** `animate-pulse`, fırlanan göy qurşağı spinnirləri qadağandır. Bütün keçidlər mexaniki və deterministikdir.
5. **Dairəvi künclər:** Heç bir `rounded-xl`, `rounded-2xl` və ya `rounded-full` düymə yoxdur. Bütün UI elementləri ya `rounded-none` (0px), ya da ən çox `rounded-[2px]` (kəskin 2px) olmalıdır.

### 1.2 Rəng Palitrası və Token İyerarxiyası
```css
/* ƏSAS QARANLIQ PALİTRA (DARK OBSIDIAN) */
--surface-bg: #09090B;        /* Əsas qara dərin fon */
--surface-panel: #111113;     /* Yan və yuxarı idarəetmə panelləri */
--surface-elevated: #18181B;  /* Aktiv və hover olunmuş elementlər */
--surface-inset: #0A0A0C;     /* İnputlar və daxili dərin bloklar */

/* SƏRHƏDLƏR (1px HAIRLINE BORDERS) */
--border-subtle: #222226;     /* Panellərarası 1px ayırıcı xətlər */
--border-active: #333338;     /* Fokus və hover sərhədləri */

/* TİPOGRAFİYA VƏ MƏTN */
--text-primary: #EDEDED;      /* Əsas oxunaqlı mətn */
--text-secondary: #A1A1AA;    /* Köməkçi məlumatlar */
--text-muted: #71717A;        /* Etiketlər, tarixlər, sönük mətn */

/* KAĞIZ EVIDENCE VƏRƏQİ (RIGHT CANVAS) */
--paper-bg: #F8F7F4;          /* Təbii kağız tonu */
--paper-text: #18181B;        /* Kağız üzərindəki dərin mürəkkəb rəngi */
--paper-border: #D4D2CA;      /* Vərəqin fiziki kənarı */

/* VURĞU VƏ SİTAT RƏNGİ (YALNIZ VƏ YALNIZ İSTİNAD VƏ BBOX ÜÇÜN) */
--accent-amber: #F59E0B;             /* RGB: 245, 158, 11 */
--accent-amber-subtle: rgba(245, 158, 11, 0.15);
--bbox-active-fill: rgba(245, 158, 11, 0.35);
--bbox-active-border: #F59E0B;
```

> **ÖNƏMLİ RƏNG QAYDASI:**  
> Narıncı/kəhrəba (`#F59E0B`) rəngi platformada İNVESTİSİYA olunmuş məlumat vurğusudur. Yuxarı naviqasiya zolağında, menyu başlıqlarında, standart ikonlarda və ya bəzək məqsədilə İstifadəsi QƏTİYYƏN YASAQDIR. Menyu və naviqasiya yalnız monoxrom ağ/boz çalarlarda olmalıdır. Narıncı rəng yalnız və yalnız:
> 1. Cavab mətni daxilindəki kliklənən sitat nişanlarında (`[1]`, `[2]`),
> 2. PDF üzərində fokuslanmış dəqiq mənbə kordinat çərçivəsində (bounding box reticle),
> 3. Retrieval Trace panelindəki dəqiq kordinat etiketində istifadə olunur.

### 1.3 Tipografiya Standartı
- **UI & Əsas Oxu:** `IBM Plex Sans` (və ya `Inter`), çəkilər: 400 (normal), 500 (medium), 600 (semibold).
- **Rəqəmlər, Kordinatlar, Gecikmələr və Telemetriya:** `IBM Plex Mono` (və ya `JetBrains Mono`), `tabular-nums` xüsusiyyəti ilə kəsilməz sütun düzülüşü.
- **Akademik PDF və Məqalə Başlıqları:** `Newsreader` / `Instrument Serif` / `Georgia` serif ailəsi (real elmi məqalə hissi üçün).

### 1.4 Mikro-İnteraksiyalar və Keçid Əyriləri
- **Optik Nişangah Kilidi (Reticle Snap):** `150ms cubic-bezier(0.16, 1, 0.3, 1)`  
  Sitat kliklənən anda PDF-dəki BBox 1.03x ölçüdən 1.0x ölçüyə mexaniki kəskinliklə sıxılır və hədəfə yapışır.
- **Mexaniki Düymə Basılması:** `75ms linear`, `active:scale-[0.98]`.
- **CSS Grid Diafraqma Açılışı (Retrieval Trace):** `grid-rows-[0fr]`-dən `grid-rows-[1fr]`-ə keçid, titrəməsiz (zero-jitter).

---

## 2. 3 PANELLİ İŞ MÜHİTİ STRUKTURU (SWISS SPLIT SCREEN)

1. **Sol Panel (Indexed Documents & Retrieval Controls — 260px sabit):**
   - İndekslənmiş sənədlərin siyahısı (`cuda_kernel.pdf`, `architecture_v2.pdf`, və s.).
   - Sənəd yükləmə qutusu (PDF, Markdown — 120MB-a qədər).
   - Real vaxt indekslənmə statusu (məs: `Processing 78%` tərəqqi zolağı ilə).
   - Hibrid balans slayderi: Dense Vector % vs BM25 Lexical %.
   - Top-k namizədlər seçimi və aktiv Re-ranker modeli göstəricisi (`bge-reranker-large`).

2. **Orta Panel (Research Q&A Stream & Retrieval Trace — 42% - 48% enində):**
   - Aktiv sessiya başlığı və FP16 dəqiqlik statusu.
   - İstifadəçinin araşdırma sualı kartı (`Query #884-AX`).
   - Süni intellektin vizual istinadlı cavabı (hər bir faktın arxasında `[1]`, `[2]` sitat düymələri).
   - Açılıb-bağlanan **Retrieval & Rerank Trace** paneli:
     * Leksik sorğu və BM25 xalı,
     * Semantik sorğu və Kosinus oxşarlıq dərəcəsi,
     * Top 3 chunk kartları və yekun hibrid RRF balları.
   - Araşdırma daxiletmə sahəsi (`Ask a research question...`), model seçicisi və `⌘K` / `⌘↵` qısayolları.

3. **Sağ Panel (Tactile #F8F7F4 Document Evidence Canvas — 52% - 58% enində):**
   - Kağız ətrafında #151518 tünd işçi fonu (24px padding).
   - Vərəq başlığı idarəedicisi: Sənəd adı, Cari səhifə / Ümumi səhifə (`p. 04 / 18`), `<` `>` səhifələmə düymələri, `- 100% +` böyütmə miqyası, və bütün BBox-ları göstər/gizlət keçidi.
   - İsti kağız tonunda (#F8F7F4) mərkəzləşdirilmiş real A4 vərəqi.
   - Səhifə üzərindəki mətnlər və düsturlar (Equation 4.2).
   - Sitat klikləndikdə avtomatik sürüşmə (smooth scroll) və `[Ref 1] Y: 142.4, X: 48.0, W: 540` koordinatlı optik sarı çərçivə.

---

## 3. ARXİTEKTURA VƏ MƏLUMATLAR BAZASI STANDARTLARI

### 3.1 Verilənlər Bazası (PostgreSQL 16 + pgvector)
Drizzle ORM vasitəsilə 2 əsas cədvəl idarə olunur:

```sql
-- 1. documents cədvəli
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT NOT NULL,
  total_pages INT NOT NULL DEFAULT 1,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'indexed', -- 'uploading', 'processing', 'indexed', 'failed'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. document_chunks cədvəli
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  page_number INT NOT NULL,
  content TEXT NOT NULL,
  -- BBox: [0..1] aralığında normallaşdırılmış koordinatlar
  -- x (sol), y (yuxarı), w (en), h (hündürlük)
  bbox JSONB NOT NULL,
  token_count INT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small/large
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- İndekslər
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chunks_tsv ON document_chunks USING gin (search_tsv);
CREATE INDEX idx_chunks_doc_page ON document_chunks (document_id, page_number);
```

### 3.2 PDF Koordinat Transformasiyası Qaydası
- PDF standartı: 72 DPI, başlanğıc nöqtəsi `(0, 0)` **aşağı-sol** küncdür.
- DOM / HTML Canvas standartı: Başlanğıc nöqtəsi `(0, 0)` **yuxarı-sol** küncdür.
- Bütün BBox koordinatları bazada mütləq səhifə eni və hündürlüyünə nisbətdə `0.0 .. 1.0` aralığında normallaşdırılmış saxlanılmalıdır:
  $$x_{norm} = \frac{x_{pdf}}{W_{page}}, \quad y_{norm} = \frac{H_{page} - y_{top\_pdf}}{H_{page}}$$
- Ekranda render zamanı bu normallaşdırılmış dəyərlər cari vərəqin faktiki DOM en və hündürlüyünə (`clientWidth`, `clientHeight`) vurularaq dəqiq piksel pikselə çıxarılır.

### 3.3 Hibrid Axtarış Düsturu (Reciprocal Rank Fusion - RRF)
Semantik vektor axtarışının sırası $R_{dense}$ və leksik BM25 açar söz axtarışının sırası $R_{sparse}$ bu düsturla birləşdirilir:
$$Score_{RRF}(d) = w_{dense} \cdot \frac{1}{k + R_{dense}(d)} + w_{sparse} \cdot \frac{1}{k + R_{sparse}(d)}$$
Burada $k = 60$ olaraq təyin edilir, $w_{dense}$ və $w_{sparse}$ isə UI slayderi vasitəsilə tənzimlənir (defolt: 0.65 və 0.35).

### 3.4 C# & .NET 9 (ASP.NET Core 9.0) Dual-Engine Arxitekturası
Əsas yol xəritəsindən caymadan sistem Dual-Engine modeli ilə fəaliyyət göstərir:
- **Next.js 14 BFF:** İstifadəçi interfeysi, 150ms optik nişangah BBox animasiyası və Vercel AI SDK axınını (`streamText`) idarə edir.
- **C# .NET 9 Web API (`Veritas.Core.Api`):**
  - `net9.0` ən son rəsmi versiyasında yüksək ötürücülü sənəd idarəetməsi və fayl yükləmə qovşağı (120MB-a qədər).
  - `VeritasDbContext` (EF Core 9.0 + Npgsql 9.0 + `Pgvector.EntityFrameworkCore`) ilə PostgreSQL 16 `documents` və `document_chunks` cədvəllərinin idarəsi.
  - `PdfPig` kitabxanası ilə C# sub-pixel koordinat çıxarışı və BBox normallaşdırması.
  - Hibrid RRF axtarış xidməti (`/api/v1/hybridsearch`).
- **Vahid Təqdimat və Qapı Arxitekturası (Unified Localhost:3000 Gateway):**
  - Təqdimat və istehsalat mühitində tək domen/port vahidliyini təmin etmək üçün Next.js App Router daxilində `next.config.mjs` reverse-proxy (rewrites) konfiqurasiya edilmişdir.
  - Xarici istifadəçi və təqdimat izləyicisi yalnız tək `http://localhost:3000` ünvanı görür:
    - `http://localhost:3000/` -> Swiss Grid Workspace UI
    - `http://localhost:3000/api/v1/*` -> Arxa plandakı .NET 9 Core API mühərrikinə şəffaf proxy
    - `http://localhost:3000/swagger` -> .NET 9 Swagger interaktiv sənədləşməsi
    - `http://localhost:3000/health` -> .NET 9 Sistem monitorinq və sağlamlıq statusu
  - Nəticə: Sıfır CORS xətası, vahid port və qüsursuz təqdimat təcrübəsi.
- Hər iki mühərrik eyni PostgreSQL 16 + pgvector bazasını paylaşır (port 5433).

---

## 4. KODLAMA VƏ MÜHƏNDİSLİK MƏCBURİYYƏTLƏRİ

1. **100% TypeScript & C# 13 (.NET 9):** Heç bir `any` tipi istifadə oluna bilməz. Bütün sənədlər, kordinatlar, sitatlar və API cavabları sərt tipləşdirilmiş interfeyslərə malik olmalıdır. C# layihəsi `Nullable` enabled və Clean Architecture prinsiplərinə tam tabedir.
2. **Vercel React Best Practices:**
   - Heç bir lazımsız təkrar render (unnecessary re-render) olmamalıdır.
   - Sənəd vərəqi və BBox təbəqəsi `React.memo` və `useCallback` ilə qorunmalıdır.
   - Server və Client komponentləri aydın ayrılmalıdır.
3. **Playwright E2E Doğrulaması:**
   Hər bir əsas funksiya (sitat kliklənməsi, səhifə çevrilməsi, trace açılması) Playwright E2E testləri ilə təsdiqlənmədən "tamamlandı" elan edilə bilməz.
4. **Skills İstifadə Qaydası:**
   Qoşulmuş 266 bacarıq (Dex, Taste-skill, Vercel suite, Kotaemon, Onyx, Supabase, Context7, Strix, Driver.js) iş zamanı avtonom şəkildə aktivləşdirilməlidir.

---

## 5. İŞ REJİMİ VƏ GÜNÜN SONU PROTOKOLU (DAILY WRAP-UP PROTOCOL)

İstifadəçi günün sonunda **"fso bu gün bitdi"**, **"bu günlük bu qədər"** və ya oxşar yekun ifadəsi bildirdikdə, sistem avtomatik olaraq bu qızıl qayda üzrə hərəkət edir:
1. **Günün İşlərinin Təhlili:** Gün ərzində yazılmış bütün kodlar, əlavə olunmuş komponentlər, düzəldilmiş xətalar və arxitektur irəliləyişlər analiz edilir.
2. **README.md Sinxronizasiyası:**
   - 6 Həftəlik Yol Xəritəsində (`Roadmap`) günə aid bəndlər `[x]` ilə tamamlanır və icra olunan dəqiq detallar əlavə edilir.
   - Əsas funksionallıqlar, yeni API endpoint-lər və qovluq strukturu tam yenilənir.
3. **Avtomatik Git Commit & Push Hazırlığı:**
   - Bütün dəyişikliklər standart konvensiyalı commit mesajı ilə (`docs: update README with daily progress ...`) commit edilir və repozitoriyaya göndərilir.
4. **Xülasə və Sabahkı Plan:** İstifadəçiyə günün rəsmi yekun xülasəsi və növbəti iş gününün ilk addımları aydın təqdim olunur.
