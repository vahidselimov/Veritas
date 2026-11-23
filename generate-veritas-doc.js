const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  Header,
  Footer,
  PageNumber,
} = require('docx');

// Rəng Palitrası Sabitləri
const COLOR_PRIMARY = '09090B'; // Mat qara
const COLOR_SECONDARY = '334155'; // Slate
const COLOR_AMBER = 'D97706'; // Oxunaqlı Kəhrəba / Narıncı
const COLOR_AMBER_LIGHT = 'FFFBEB'; // Açıq kəhrəba arxa fon
const COLOR_MUTED = '64748B'; // Boz sönük
const COLOR_BORDER = 'E2E8F0'; // İncə cədvəl xətti
const COLOR_HEADER_BG = '0F172A'; // Tünd cədvəl başlığı fonu
const COLOR_ZEBRA = 'F8FAFC'; // Alternativ sətir fonu

function createCallout(title, textLines, isWarning = false) {
  const borderColor = isWarning ? 'EF4444' : COLOR_AMBER;
  const bgColor = isWarning ? 'FEF2F2' : COLOR_AMBER_LIGHT;

  const paragraphs = [
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: (isWarning ? '⚠️ ' : '📌 ') + title,
          bold: true,
          color: borderColor,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
  ];

  for (const line of textLines) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: line,
            size: 20,
            color: COLOR_SECONDARY,
            font: 'Arial',
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 160 },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

function createStyledTable(headers, rowsData, colWidthsPercent) {
  const tableRows = [];

  // Başlıq sətri
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((header, idx) => {
        return new TableCell({
          width: { size: colWidthsPercent[idx], type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  color: 'FFFFFF',
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        });
      }),
    })
  );

  // Məlumat sətirləri
  rowsData.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    const bg = isEven ? 'FFFFFF' : COLOR_ZEBRA;

    tableRows.push(
      new TableRow({
        children: row.map((cellText, cIdx) => {
          return new TableCell({
            width: { size: colWidthsPercent[cIdx], type: WidthType.PERCENTAGE },
            shading: { fill: bg, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    size: 19,
                    color: COLOR_SECONDARY,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          });
        }),
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

async function buildDocument() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22, color: COLOR_SECONDARY },
        },
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: { size: 48, bold: true, color: COLOR_PRIMARY, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 100 }, alignment: AlignmentType.LEFT },
        },
        {
          id: 'Subtitle',
          name: 'Subtitle',
          basedOn: 'Normal',
          run: { size: 24, italics: true, color: COLOR_AMBER, font: 'Arial' },
          paragraph: { spacing: { before: 0, after: 240 }, alignment: AlignmentType.LEFT },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 30, bold: true, color: COLOR_PRIMARY, font: 'Arial' },
          paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, color: COLOR_AMBER, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, color: COLOR_SECONDARY, font: 'Arial' },
          paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'VERITAS // CORPUS — Master Architecture & Engineering Roadmap',
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Səhifə ',
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // SƏNƏD BAŞLIĞI
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun('VERITAS // CORPUS')],
          }),
          new Paragraph({
            style: 'Subtitle',
            children: [
              new TextRun(
                'Vizual İstinadlı Deep Research AI Platforması (NotebookLM + Perplexity Hibridi)'
              ),
            ],
          }),

          createCallout('İCRAİ XÜLASƏ VƏ TƏYİNAT', [
            'Bu sənəd kursun yekun final layihəsi olan VERITAS // CORPUS platformasının tam proqram təminatı arxitekturasını, qəti Anti-AI dizayn qaydalarını, 266 bacarığın (skills) istifadə xəritəsini, dərin Gap analizini və 1.5 aylıq (6 həftəlik) addım-addım iş planını özündə cəmləşdirir.',
            'Layihənin mühəndislik nüvəsi: Generasiya olunan hər bir cümlənin PDF sənədindəki dəqiq səhifə və koordinatlarla (x, y, w, h) optik nişangah vasitəsilə vizual olaraq təsdiqlənməsi.',
            'İnteqrasiya Tələbi: Əsas yol xəritəsindən caymadan sistemin backend infrastrukturuna əlavə olaraq C# və .NET 9 (ASP.NET Core 9.0) güclü mühəndislik arxitekturası daxil edilmişdir.',
          ]),

          new Paragraph({ spacing: { before: 160 } }),

          // BÖLMƏ 1: C# & ASP.NET CORE 5.0 HİBRİD DUAL-ENGINE ARXİTEKTURASI
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('1. C# & ASP.NET CORE 5.0 HİBRİD DUAL-ENGINE ARXİTEKTURASI')],
          }),

          new Paragraph({
            children: [
              new TextRun(
                'İlkin yol xəritəsindən zərrə qədər kənara çıxmadan və heç bir memarlıq problemi yaşamamaq üçün sistem Dual-Engine Enterprise Model (Next.js BFF + .NET 9 (ASP.NET Core 9.0) High-Performance API) üzərində qurulur:'
              ),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun('1.1 Rolların və Məsuliyyətlərin Dəqiq Bölgüsü')],
          }),

          createStyledTable(
            ['Təbəqə / Modul', 'Texnoloji Stek', 'Məsuliyyət Sahəsi və İcra Rolu'],
            [
              [
                'İstifadəçi İnterfeysi (UI)',
                'Next.js 14 (App Router) + TypeScript + Tailwind CSS',
                'İsveçrə tor (Swiss Grid) 3 panelli iş mühiti, #F8F7F4 isti kağız Evidence Canvas, 150ms optik nişangah BBox animasiyası və telemetriya HUD-u.',
              ],
              [
                'Canlı AI Axını (BFF)',
                'Vercel AI SDK (streamText) + Node.js 24',
                'İstifadəçi ilə canlı çat sessiyası, modelə [chunk_id] istinad formatının tapşırılması, canlı sitat qırılmalarının buferlənməsi.',
              ],
              [
                'Core Enterprise Backend',
                'C# və .NET 9 (ASP.NET Core 9.0) (Web API)',
                'Yüksək ötürücülü sənəd idarəetməsi, 120MB-a qədər PDF yükləmə qovşağı, PdfPig ilə C# sub-pixel koordinat çıxarışı, EF Core 9.0 / PostgreSQL əməliyyatları, audit loqları.',
              ],
              [
                'Hibrid Axtarış Xidməti',
                '.NET 9 (ASP.NET Core 9.0) + Npgsql + pgvector',
                'Vektor kosinus axtarışı ilə BM25 leksik axtarışını Reciprocal Rank Fusion (RRF k=60) düsturu ilə emal edib ən yaxşı 5 parçanı seçən C# axtarış mühərriki.',
              ],
              [
                'Vahid Verilənlər Bazası',
                'PostgreSQL 16 + pgvector',
                'Həm Next.js (Drizzle ORM), həm də .NET 9 (ASP.NET Core 9.0) (EF Core 9.0) tərəfindən idarə olunan vahid sənəd və BBox repozitoriyası.',
              ],
            ],
            [22, 33, 45]
          ),

          new Paragraph({ spacing: { before: 160 } }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun('1.2 C# .NET 9 (ASP.NET Core 9.0) Layihə Strukturu')],
          }),

          new Paragraph({
            children: [
              new TextRun(
                'Arxitekturanın təmizliyini (Clean Architecture) qorumaq üçün C# həlli (Solution) aşağıdakı 4 qatdan ibarətdir:'
              ),
            ],
          }),

          createStyledTable(
            ['Layihə Adı (Project)', 'Təyinatı', 'Əsas Komponentlər və Kitabxanalar'],
            [
              [
                'Veritas.Core.Api (net9.0)',
                'RESTful API Gateway və Kontrollerlər',
                'DocumentsController, HybridSearchController, EvalsController, Swagger UI (OpenAPI), CORS, Rate Limiting.',
              ],
              [
                'Veritas.Core.Domain (net9.0)',
                'Əsas Domen Modelləri və İnterfeyslər',
                'Document, DocumentChunk, BoundingBox, CitationRef, IDocumentRepository, IPdfCoordinateExtractor.',
              ],
              [
                'Veritas.Core.Infrastructure',
                'PostgreSQL EF Core 9.0 və Verilənlər Bazas',
                'VeritasDbContext, Npgsql.EntityFrameworkCore.PostgreSQL, HNSW Vector Index konfiqurasiyası, Raw SQL RRF query.',
              ],
              [
                'Veritas.Core.Services',
                'C# PDF Koordinat və RRF Alqoritmləri',
                'PdfPig ilə BBox koordinat çıxarıcısı, Reciprocal Rank Fusion kalkulyatoru, Cohere/Local Re-ranker adapteri.',
              ],
            ],
            [28, 32, 40]
          ),

          new Paragraph({ spacing: { before: 200 } }),

          // BÖLMƏ 2: DƏRİN GAP ANALİZİ
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('2. DƏRİN GAP ANALİZİ: İLK PROMPTDA NƏLƏR ƏKSİKDİR?')],
          }),

          new Paragraph({
            children: [
              new TextRun(
                'İstehsalat səviyyəli vizual tədqiqat sistemində nəzərə alınmalı olan 8 kritik mühəndislik nöqtəsi:'
              ),
            ],
          }),

          createStyledTable(
            ['Kritik Boşluq (Gap)', 'İlkin Vəziyyətin Çatışmazlığı', 'Tətbiq Olunacaq Dəqiq Mühəndislik Həlli'],
            [
              [
                '1. PDF ↔ DOM Koordinat Transformasiyası',
                'PDF koordinatları 72 DPI və aşağı-sol küncdən başlayır, brauzer DOM isə yuxarı-soldan hesablayır.',
                'Bazaya koordinatlar 0..1 aralığında nisbi yazılır: x_norm = x_pdf / W, y_norm = (H - y_top) / H. Ekranda isə cari vərəqin clientWidth/clientHeight dəyərlərinə vurularaq piksel xətası 0-a endirilir.',
              ],
              [
                '2. 2 və 3 Sütunlu Məqalələrin Oxunma Sırası',
                'Elmi məqalələr 2 sütunlu olur. Soldan-sağa xam oxunsa, hər iki sütunun sətrləri bir-birinə qarışır.',
                'PdfPig / pdfjs-dist çıxarışında XY-Cut və Spatial Clustering tətbiq olunur; əvvəlcə sol sütun abzasları, sonra sağ sütun ardıcıl oxunur.',
              ],
              [
                '3. Cədvəllər və Düsturların (Equation 4.2) Bütövlüyü',
                'Düsturlar və cədvəllər xam mətn kimi oxunduqda xarab olur və ayrı-ayrı söz kimi sitat gətirilir.',
                'Chunking zamanı cədvəl və ya LaTeX düsturu aşkarlandıqda, onun bütün hüdudları bütöv bir BBox olaraq saxlanılır və tək blok kimi işıqlandırılır.',
              ],
              [
                '4. Skan Olunmuş PDF-lər və OCR Fallback',
                'Mətn qatı olmayan skan sənədlərdə xam parser boş string qaytarır və sistem sıradan çıxır.',
                'Sənəd daxil olduqda simvol sıxlığı yoxlanılır; simvol sayı < 50 olduqda sistem avtomatik OCR fallback rejiminə (Tesseract / VLM) keçir.',
              ],
              [
                '5. Canlı Streaming Sitatlarının Token Qırılması',
                'streamText axınında [1] sitat teqi iki paket arasında bölünə bilər (məs: [ və 1]).',
                'Frontend-də xüsusi buferli Citation State Machine qurulur; natamam mötərizə gəldikdə buferdə saxlanılır, bağlandıqda kliklənən düyməyə çevrilir.',
              ],
              [
                '6. Çoxsaylı Sənədlər Arasında Çarpaz İstinad',
                'AI bir cavabda eyni vaxtda 2 fərqli PDF-dən sitat gətirə bilər.',
                'Sitat teqləri [doc_id:chunk_id] formatında generasiya olunur; istifadəçi kliklədikdə sağ paneldə avtomatik həmin sənəd açılır və vərəq çevrilir.',
              ],
              [
                '7. Re-ranker Server / Offline Fallback',
                'Xarici Re-ranker API (Cohere) açarı bitdikdə və ya şəbəkə gecikdikdə axtarış iflas edə bilər.',
                'PostgreSQL daxilində tam deterministik lokal Reciprocal Rank Fusion (RRF k=60) ehtiyat alqoritmi hər zaman hazır saxlanılır.',
              ],
              [
                '8. PDF Zərərvericiləri və Təhlükəsizlik',
                'PDF faylları daxilində zərərli skriptlər (/Launch, /JavaScript) və ya prompt-injeksiya ola bilər.',
                'PDF oxunarkən zərərli axınlar süzülür, mətn xüsusi sanitarlaşdırma filtrindən keçirilərək modelə ötürülür.',
              ],
            ],
            [22, 38, 40]
          ),

          new Paragraph({ spacing: { before: 200 } }),

          // BÖLMƏ 3: 266 BACARIĞIN (SKILLS) TƏTBİQİ
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('3. 266 BACARIĞIN (SKILLS) TƏTBİQİ MATRİSİ')],
          }),

          createStyledTable(
            ['Bacarıq Qrupu (Skill)', 'Mərhələ / Həftə', 'Nə Üçün Lazımdır?', 'Necə Tətbiq Edilir?'],
            [
              [
                'design-taste-frontend',
                'Həftə 1, 4',
                'Anti-AI İsveçrə tor estetikasının qorunması',
                'Komponentlərin 0px künc, 1px hairline sərhəd və 150ms optik nişangah animasiyası standartlarını yoxlayır.',
              ],
              [
                'vercel-react-best-practices',
                'Həftə 1, 3, 4',
                '70+ qayda ilə sıfır lazımsız render',
                'EvidenceCanvas və sitat düymələrini React.memo və useCallback ilə təcrid edərək kətanın axıcı işləməsini təmin edir.',
              ],
              [
                'kotaemon',
                'Həftə 2, 3',
                'İstehsalat RAG və sitat çıxarışı nümunəsi',
                'PDF mətnlərinin dəqiq sitat koordinatları ilə çıxarılması və ReAct mühakimə dövrəsi üçün arxitektura bazasıdır.',
              ],
              [
                'supabase-postgres-best-practices',
                'Həftə 1, 3',
                'pgvector və tsvector indeks tüninqi',
                'PostgreSQL 16 HNSW indeksinin və GIN indeksinin optimal qurulması, əlaqə hovuzunun idarəsi.',
              ],
              [
                'context7-cli & find-docs',
                'Daimi',
                'Ən son rəsmi kitabxana sənədlərinin oxunması',
                'pdfjs-dist, Drizzle ORM, EF Core 9.0 və AI SDK API imzalarını canlı mənbədən təsdiqləyir.',
              ],
              [
                'driver-js',
                'Həftə 5',
                'İnteraktiv onboarding turu',
                'Yeni istifadəçiyə [1] düyməsinə basdıqda PDF-dəki dəqiq kordinatın necə hədəfə alındığını göstərən canlı tur.',
              ],
              [
                'arena',
                'Həftə 5',
                'Sitat keyfiyyətinin sub-agent qiymətləndirməsi',
                'Generasiya olunan hər bir cavabın PDF koordinatlarına 100% uyğunluğunu avtomatik sınaqdan keçirən bençmark.',
              ],
              [
                'strix pentest suite',
                'Həftə 6',
                'Təhlükəsizlik və OWASP Top 10 yoxlaması',
                'PDF yükləmə zəifliklərini, prompt injeksiya hücumlarını və API qorunmasını audit edir.',
              ],
              [
                'mempalace',
                'Daimi',
                '1.5 aylıq layihə yaddaşının saxlanması',
                'Bütün qərarları, test nəticələrini və dəyişiklikləri daimi sistem sarayında arxivləşdirir.',
              ],
            ],
            [22, 16, 32, 30]
          ),

          new Paragraph({ spacing: { before: 200 } }),

          // BÖLMƏ 4: 1.5 AYLIK (6 HƏFTƏLİK) MASTER İŞ VƏ YOL XƏRİTƏSİ
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('4. 1.5 AYLIK (6 HƏFTƏLİK) MASTER İŞ VƏ YOL XƏRİTƏSİ')],
          }),

          createCallout('HƏFTƏ 1: Bünövrə, İsveçrə UI və Verilənlər Bazası (Tamamlandı ✅)', [
            'Nəticələr: Next.js App Router, Tailwind CSS İsveçrə konfiqurasiyası, Docker Compose ilə PostgreSQL 16 + pgvector, Drizzle ORM sxemi (documents, document_chunks), PROJECT_RULES.md.',
            'C# Əlavəsi: Veritas.Core.Api və Veritas.Core.Infrastructure (.NET 9 (ASP.NET Core 9.0)) həllinin bünövrəsi qoyuldu.',
            'Doğrulama: Playwright E2E testləri 4/4 uğurla tamamlandı.',
          ]),

          new Paragraph({ spacing: { before: 100 } }),

          createCallout('HƏFTƏ 2: PDF Parsing & Sub-Pixel BBox Mühərriki', [
            'Hədəf: PDF sənədlərinin serverdə oxunması, 2 sütunlu mətnlərin XY-Cut alqoritmi ilə sıralanması, hər cümlənin (x, y, w, h) kordinatlarının normallaşdırılması və embedding yaradılması.',
            'C# .NET 9 (ASP.NET Core 9.0) Modulu: PdfPig kitabxanası ilə yüksək sürətli C# PDF BBox ekstraktoru (PdfCoordinateExtractorService).',
            'Node.js Modulu: pdfjs-dist əsaslı ehtiyat ekstraktor.',
            'API: /api/v1/documents/upload yükləmə və fon emalı xidməti.',
          ]),

          new Paragraph({ spacing: { before: 100 } }),

          createCallout('HƏFTƏ 3: Hibrid Axtarış (Dense + BM25) və RRF Re-ranking', [
            'Hədəf: Vektor oxşarlığı ilə leksik açar söz axtarışını birləşdirən RRF mühərriki.',
            'C# .NET 9 (ASP.NET Core 9.0) Modulu: HybridSearchService - Npgsql vasitəsilə PostgreSQL pgvector kosinus axtarışı + tsvector BM25 axtarışı.',
            'Alqoritm: Score_RRF(d) = w_dense / (60 + R_dense) + w_sparse / (60 + R_sparse).',
            'Nəticə: Top-40 namizəddən ən dəqiq 4-5 mənbə parçasının seçilməsi.',
          ]),

          new Paragraph({ spacing: { before: 100 } }),

          createCallout('HƏFTƏ 4: Canlı Sitat Streaming və İnteraktiv PDF Kətanı', [
            'Hədəf: Vercel AI SDK ilə streamText çat axını və [1] düyməsinə kliklədikdə PDF-in optik nişangahla hədəfə yapışması.',
            'Komponentlər: Next.js CitationBadgeParser (buferli token parseri), EvidenceCanvas (#F8F7F4 isti kağız), ReticleFrame (150ms optik kilid).',
            'İnteqrasiya: Next.js çatı birbaşa .NET 9 (ASP.NET Core 9.0) hibrid axtarış API-sindən bəslənir.',
          ]),

          new Paragraph({ spacing: { before: 100 } }),

          createCallout('HƏFTƏ 5: Multi-Corpus İdarəetməsi, Driver.js Turu & Arena Evals', [
            'Hədəf: Çoxlu sənədlərin eyni vaxtda idarəsi, onboarding bələdçisi və bençmark testi.',
            'Funksiyalar: Driver.js ilə 4 addımlı interaktiv təlimat turu.',
            'Evals: Arena sub-agenti vasitəsilə halüsinasiya dərəcəsinin ölçülməsi və 120 test keysi üzrə IoU kordinat dəqiqliyinin yoxlanması.',
          ]),

          new Paragraph({ spacing: { before: 100 } }),

          createCallout('HƏFTƏ 6: Strix Pentest, Optimizasiya & İstehsalata Buraxılış', [
            'Hədəf: Təhlükəsizlik sınaqları, performans tüninqi və yekun diplom/kurs təqdimatı.',
            'Təhlükəsizlik: Strix pentest modulu ilə OWASP Top 10, PDF injeksiya və prompt injeksiya testləri.',
            'Performans: p95 axtarış gecikməsinin <140ms saxlanılması, Docker Compose ilə vahid istehsalat paketi.',
          ]),

          new Paragraph({ spacing: { before: 200 } }),

          // BÖLMƏ 5: QƏTİ ANTI-AI DİZAYN SPESİFİKASİYASI
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('5. QƏTİ ANTI-AI DİZAYN SPESİFİKASİYASI')],
          }),

          createStyledTable(
            ['Dizayn Parametri', 'Dəyər / Standart', 'Qadağan Olunan Elementlər'],
            [
              ['Əsas Fon Rəngi', '#09090B (Mat qara Obsidian)', 'Açıq boz və ya rəngli fonlar qadağandır.'],
              ['Panellər və Zolaqlar', '#111113 və #18181B', 'Qeyri-müəyyən təbəqələr yoxdur.'],
              ['Sərhədlər (Borders)', '1px solid #222226 (Hairline)', 'Gradient borderlər, qalın çərçivələr qadağandır.'],
              ['Kağız Sənəd Kətanı', '#F8F7F4 (Real isti kağız tonu)', 'Qara fonda PDF oxumaq qadağandır.'],
              ['Kəhrəba Vurğusu (#F59E0B)', 'Yalnız sitat düymələri [1] və aktiv BBox', 'Menyuda, başlıqda və ya bəzəkdə istifadəsi QƏTİ YASAQDIR.'],
              ['Künclər (Border Radius)', 'rounded-none (0px) və ya rounded-[2px]', 'rounded-lg, rounded-xl, rounded-full qadağandır.'],
              ['Tipografiya', 'IBM Plex Sans, IBM Plex Mono, Newsreader', 'Comic Sans, dekorativ şriftlər qadağandır.'],
              ['Mikro-animasiya', '150ms cubic-bezier(0.16, 1, 0.3, 1)', 'animate-pulse, fırlanan AI spinnirləri qadağandır.'],
            ],
            [25, 35, 40]
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve('c:/Users/Hsyn/Desktop/veritas/VERITAS_CORPUS_Master_Plan.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully written to: ${outputPath}`);
}

buildDocument().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
