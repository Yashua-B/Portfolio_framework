#target photoshop
app.bringToFront();

(function () {

  // ------------------------- Version gates -------------------------
  var majorVersion = parseInt(app.version.split(".")[0], 10);
  var canWebP = (majorVersion >= 23); // Photoshop 2022+
  var canAVIF = (majorVersion >= 26); // Photoshop 2025+

  function s2t(s) { return app.stringIDToTypeID(s); }

  // ------------------------- Helpers -------------------------
  function padN(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
  }

  function clampInt(v, min, max, fallback) {
    v = parseInt(v, 10);
    if (isNaN(v)) return fallback;
    return Math.max(min, Math.min(max, v));
  }

  function isBlank(s) { return String(s).replace(/\s+/g, "") === ""; }

  function parsePageList(text) {
    var pages = {};
    if (!text) return pages;
    text = String(text).replace(/\s+/g, "");
    if (!text.length) return pages;

    var parts = text.split(",");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;

      var dash = p.indexOf("-");
      if (dash >= 0) {
        var a = parseInt(p.substring(0, dash), 10);
        var b = parseInt(p.substring(dash + 1), 10);
        if (isNaN(a) || isNaN(b)) continue;
        var start = Math.min(a, b);
        var end = Math.max(a, b);
        for (var n = start; n <= end; n++) pages[n] = true;
      } else {
        var single = parseInt(p, 10);
        if (!isNaN(single)) pages[single] = true;
      }
    }
    return pages;
  }

  function ensureSRGB8bit(doc) {
    try {
      if (doc.mode !== DocumentMode.RGB) {
        try { doc.changeMode(ChangeMode.RGB); } catch (e1) {}
      }
      try { doc.bitsPerChannel = BitsPerChannelType.EIGHT; } catch (e2) {}
      try { doc.convertProfile("sRGB IEC61966-2.1", Intent.RELATIVECOLORIMETRIC, true, false); } catch (e3) {}
    } catch (e) {}
  }

  function forceWhiteBackground(doc) {
    try {
      var whiteLayer = doc.artLayers.add();
      whiteLayer.name = "WHITE_BACKGROUND";
      whiteLayer.move(doc.layers[doc.layers.length - 1], ElementPlacement.PLACEAFTER);

      doc.selection.selectAll();
      var c = new SolidColor();
      c.rgb.red = 255; c.rgb.green = 255; c.rgb.blue = 255;
      doc.selection.fill(c);
      doc.selection.deselect();

      whiteLayer.move(doc.layers[doc.layers.length - 1], ElementPlacement.PLACEAFTER);
      doc.flatten();
    } catch (e) {}
  }

  function forceGrayscale(doc) {
    // Manual-only grayscale: converts page to grayscale, then back to RGB so export is consistent
    try { doc.changeMode(ChangeMode.GRAYSCALE); } catch (e1) {}
    try { doc.changeMode(ChangeMode.RGB); } catch (e2) {}
    try { doc.bitsPerChannel = BitsPerChannelType.EIGHT; } catch (e3) {}
  }

  function capMaxWidth(doc, maxWidthPx) {
    if (!maxWidthPx || maxWidthPx <= 0) return;
    try {
      var w = doc.width.as("px");
      var h = doc.height.as("px");
      if (w <= maxWidthPx) return;

      var scale = maxWidthPx / w;
      var newW = Math.round(w * scale);
      var newH = Math.round(h * scale);
      doc.resizeImage(UnitValue(newW, "px"), UnitValue(newH, "px"), null, ResampleMethod.BICUBICSHARPER);
    } catch (e) {}
  }

  // ------------------------- Save functions -------------------------
  function savePNG(doc, fileObj, interlaced) {
    var opts = new PNGSaveOptions();
    opts.interlaced = !!interlaced;
    doc.saveAs(fileObj, opts, true, Extension.LOWERCASE);
  }

  function saveWebP_AM(doc, fileObj, isLossless, quality, meta) {
    ensureSRGB8bit(doc);

    var d = new ActionDescriptor();
    var d2 = new ActionDescriptor();

    d2.putEnumerated(
      s2t("compression"),
      s2t("WebPCompression"),
      s2t(isLossless ? "compressionLossless" : "compressionLossy")
    );

    if (!isLossless) d2.putInteger(s2t("quality"), quality);

    d2.putBoolean(s2t("includeXMPData"), meta.xmp);
    d2.putBoolean(s2t("includeEXIFData"), meta.exif);
    d2.putBoolean(s2t("includePsExtras"), meta.ps);

    d.putObject(s2t("as"), s2t("WebPFormat"), d2);
    d.putPath(s2t("in"), fileObj);
    d.putBoolean(s2t("copy"), true);
    d.putBoolean(s2t("lowerCase"), true);

    executeAction(s2t("save"), d, DialogModes.NO);
  }

  function saveAVIF_AM(doc, fileObj, isLossless, quality, chromaKey, depthKey, speed, meta) {
    ensureSRGB8bit(doc);

    var descSave = new ActionDescriptor();
    var descAVIF = new ActionDescriptor();
    var idAVIFCompression = s2t("AVIFCompression");

    descAVIF.putEnumerated(
      s2t("colorCompression"),
      idAVIFCompression,
      s2t(isLossless ? "compressionLossless" : "compressionLossy")
    );

    if (!isLossless) descAVIF.putInteger(s2t("colorQuality"), quality);

    // keep alpha lossless
    descAVIF.putEnumerated(s2t("alphaCompression"), idAVIFCompression, s2t("compressionLossless"));

    descAVIF.putEnumerated(s2t("colorFormat"), s2t("AVIFColorFormat"), s2t(chromaKey));
    descAVIF.putEnumerated(s2t("sampleDepth"), s2t("AVIFSampleDepth"), s2t(depthKey));
    descAVIF.putInteger(s2t("encoderSpeed"), speed);

    descAVIF.putBoolean(s2t("includeXMPData"), meta.xmp);
    descAVIF.putBoolean(s2t("includeEXIFData"), meta.exif);
    descAVIF.putBoolean(s2t("includePsExtras"), meta.ps);

    descSave.putObject(s2t("as"), s2t("AVIFFormat"), descAVIF);
    descSave.putPath(s2t("in"), fileObj);
    descSave.putBoolean(s2t("lowerCase"), true);

    executeAction(s2t("save"), descSave, DialogModes.NO);
  }

  function chromaToEnum(chromaText) {
    if (chromaText === "4:4:4") return "AVIFFormat444";
    if (chromaText === "4:2:0") return "AVIFFormat420";
    return "AVIFFormat422";
  }

  function depthToEnum(depthText) {
    if (depthText === "10") return "AVIFDepth10bit";
    if (depthText === "12") return "AVIFDepth12bit";
    return "AVIFDepth8bit";
  }

  // ------------------------- PDF open (SPREAD CROP FIX) -------------------------
  function openPdfPage(pdfFile, pageNum, ppi) {
    var opts = new PDFOpenOptions();
    opts.antiAlias = true;
    opts.mode = OpenDocumentMode.RGB;
    opts.resolution = ppi;
    opts.page = pageNum;
    try { opts.cropPage = CropToType.MEDIABOX; } catch (e) {}
    return app.open(pdfFile, opts);
  }

  // ------------------------- UI (all tooltips; no flicker) -------------------------
  function buildUI() {
    var w = new Window("dialog", "Portfolio Exporter (PDF -> PNG / WebP / AVIF)");
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];

    var viewportWrap = w.add("group");
    viewportWrap.orientation = "row";
    viewportWrap.alignChildren = ["fill", "fill"];

    var viewport = viewportWrap.add("panel");
    viewport.alignChildren = ["fill", "top"];
    viewport.preferredSize = [760, 460];

    var content = viewport.add("group");
    content.orientation = "column";
    content.alignChildren = ["fill", "top"];

    var sb = viewportWrap.add("scrollbar");
    sb.preferredSize = [18, 460];
    sb.visible = true;
    sb.minvalue = 0;
    sb.maxvalue = 0;
    sb.value = 0;

    function h(ctrl) { return (ctrl.bounds[3] - ctrl.bounds[1]); }
    function updateScrollbarOnce() {
      var maxScroll = Math.max(0, h(content) - h(viewport));
      sb.minvalue = 0;
      sb.maxvalue = maxScroll;
      sb.value = Math.min(sb.value, maxScroll);
      content.location = [0, -sb.value];
    }
    sb.onChanging = function () { content.location = [0, -sb.value]; };
    w.onShow = function () { w.layout.layout(true); updateScrollbarOnce(); };

    // ---------- Presets ----------
    var presetPanel = content.add("panel", undefined, "Preset (recommended starting point)");
    presetPanel.orientation = "row";
    presetPanel.alignChildren = ["left", "center"];
    var presetLabel = presetPanel.add("statictext", undefined, "Preset:");
    presetLabel.helpTip = "Quick starting points for typical portfolio use.\nYou can always override individual settings below.";
    var presetDrop = presetPanel.add("dropdownlist", undefined, [
      "Portfolio - High Fidelity (Recommended)",
      "Portfolio - Balanced",
      "Lightweight - Smaller Files"
    ]);
    presetDrop.selection = 0;
    presetDrop.helpTip =
      "High Fidelity: AVIF/WebP at 300 PPI, good for crisp text/linework.\n" +
      "Balanced: slightly smaller outputs.\n" +
      "Lightweight: smaller widths/quality for faster web loading.";

    // ---------- Input/Output ----------
    var io = content.add("panel", undefined, "Input / Output");
    io.orientation = "column";
    io.alignChildren = ["fill", "top"];
    io.helpTip = "Choose your PDF exported from InDesign, and an output folder.\nSubfolders (png/webp/avif) will be created automatically.";

    var g1 = io.add("group");
    var pdfLbl = g1.add("statictext", undefined, "PDF:");
    pdfLbl.helpTip = "Pick the PDF you exported from InDesign (single document, multi-page).";
    var pdfPath = g1.add("edittext", undefined, "");
    pdfPath.characters = 58;
    pdfPath.helpTip = "Path to the PDF input file.";
    var pdfBtn = g1.add("button", undefined, "Choose...");
    pdfBtn.helpTip = "Select the input PDF.";

    var g2 = io.add("group");
    var outLbl = g2.add("statictext", undefined, "Output folder:");
    outLbl.helpTip = "Select a folder where the script will write images.\nIt will create png/webp/avif subfolders.";
    var outPath = g2.add("edittext", undefined, "");
    outPath.characters = 58;
    outPath.helpTip = "Path to the output folder.";
    var outBtn = g2.add("button", undefined, "Choose...");
    outBtn.helpTip = "Select the output folder.";

    // ---------- Pages / naming ----------
    var range = content.add("panel", undefined, "Pages and naming");
    range.orientation = "column";
    range.alignChildren = ["fill", "top"];
    range.helpTip = "Set which pages to export and how files are named.";

    var r1 = range.add("group");
    var startLbl = r1.add("statictext", undefined, "Start page:");
    startLbl.helpTip = "First page number to export (1-based, like Acrobat).";
    var startField = r1.add("edittext", undefined, "1"); startField.characters = 6;
    startField.helpTip = "Example: 1";

    var endLbl = r1.add("statictext", undefined, "End page:");
    endLbl.helpTip =
      "Last page number to export.\nRecommended to set this so the progress bar is accurate.\n" +
      "If left blank, the script will continue until Photoshop fails to open the next page.";
    var endField = r1.add("edittext", undefined, ""); endField.characters = 6;
    endField.helpTip = endLbl.helpTip;

    var r2 = range.add("group");
    var prefixLbl = r2.add("statictext", undefined, "Prefix:");
    prefixLbl.helpTip = "Filename prefix. Example: page_ → page_01.webp";
    var prefixField = r2.add("edittext", undefined, "page_"); prefixField.characters = 12;
    prefixField.helpTip = "Example: page_";

    var padLbl = r2.add("statictext", undefined, "Zero-pad:");
    padLbl.helpTip = "How many digits to pad page numbers.\n2 = page_01, 3 = page_001.";
    var padDrop = r2.add("dropdownlist", undefined, ["2", "3", "4"]);
    padDrop.selection = 0;
    padDrop.helpTip = padLbl.helpTip;

    // ---------- Global rendering ----------
    var renderPanel = content.add("panel", undefined, "Global rendering");
    renderPanel.orientation = "column";
    renderPanel.alignChildren = ["fill", "top"];
    renderPanel.helpTip = "Applies to all formats (PNG/WebP/AVIF).";

    var bgGroup = renderPanel.add("group");
    var bgLbl = bgGroup.add("statictext", undefined, "Background:");
    bgLbl.helpTip =
      "Flatten onto white is recommended for portfolios.\n" +
      "It removes transparency and ensures a consistent white page.\n" +
      "Often reduces file size (especially PNG).";
    var bgDrop = bgGroup.add("dropdownlist", undefined, [
      "Keep transparency",
      "Flatten onto white (Recommended)"
    ]);
    bgDrop.selection = 1;
    bgDrop.helpTip = bgLbl.helpTip;

    // ---------- Formats ----------
    var fmt = content.add("panel", undefined, "Formats and quality");
    fmt.orientation = "column";
    fmt.alignChildren = ["fill", "top"];
    fmt.helpTip = "Each format can have its own PPI and optional Max width cap.";

    // --- PNG ---
    var pngPanel = fmt.add("panel", undefined, "PNG (lossless, can be large)");
    pngPanel.orientation = "column";
    pngPanel.alignChildren = ["fill", "top"];
    pngPanel.helpTip = "PNG is lossless. It does NOT have a quality slider.\nFile size mainly depends on pixel dimensions.";

    var pngTop = pngPanel.add("group");
    var pngCheck = pngTop.add("checkbox", undefined, "Export PNG");
    pngCheck.value = true;
    pngCheck.helpTip =
      "Enable PNG export.\nPNG is best as a fallback or when you need exact lossless output.\n" +
      "For web, PNG can get very large.";

    var pngPpiLbl = pngTop.add("statictext", undefined, "PPI:");
    pngPpiLbl.helpTip =
      "Rasterization resolution when opening the PDF.\nHigher PPI = more pixels = bigger files.\n" +
      "Typical: 200–300 for portfolio pages.";
    var pngPpi = pngTop.add("edittext", undefined, "250"); pngPpi.characters = 6;
    pngPpi.helpTip = pngPpiLbl.helpTip;

    var pngMaxLbl = pngTop.add("statictext", undefined, "Max width px (optional):");
    pngMaxLbl.helpTip =
      "Optional size cap (resamples) to control file size.\n" +
      "Example: 2800 or 3200. Leave blank for no cap.\n" +
      "This affects pixel dimensions, not print quality.";
    var pngMaxW = pngTop.add("edittext", undefined, ""); pngMaxW.characters = 6;
    pngMaxW.helpTip = pngMaxLbl.helpTip;

    var pngInterlace = pngTop.add("checkbox", undefined, "Interlaced");
    pngInterlace.value = false;
    pngInterlace.helpTip =
      "Interlaced PNG loads progressively in some viewers.\n" +
      "Slightly larger files. Usually OFF for modern web use.";

    var pngGrayGroup = pngPanel.add("group");
    var pngGrayCheck = pngGrayGroup.add("checkbox", undefined, "Force grayscale on selected pages");
    pngGrayCheck.value = false;
    pngGrayCheck.helpTip =
      "Converts only the pages you specify to grayscale.\n" +
      "This is NOT automatic image analysis. It will ONLY affect listed pages.";
    var pngGrayPagesLbl = pngGrayGroup.add("statictext", undefined, "Pages:");
    pngGrayPagesLbl.helpTip =
      "Pages to force grayscale.\nFormat: 3,7-10,12\nLeave blank to affect none.";
    var pngGrayPages = pngGrayGroup.add("edittext", undefined, ""); pngGrayPages.characters = 22;
    pngGrayPages.helpTip = pngGrayPagesLbl.helpTip;

    // --- WebP ---
    var webpPanel = fmt.add("panel", undefined, "WebP (good fallback)");
    webpPanel.orientation = "column";
    webpPanel.alignChildren = ["fill", "top"];
    webpPanel.helpTip =
      "WebP is a modern web image format.\n" +
      "Lossy WebP at quality ~80–90 is often visually excellent for portfolios.";

    var webpTop = webpPanel.add("group");
    var webpCheck = webpTop.add("checkbox", undefined, "Export WebP");
    webpCheck.value = true;
    webpCheck.enabled = canWebP;
    webpCheck.helpTip =
      canWebP
        ? "Enable WebP export."
        : "WebP requires Photoshop 2022+ (this option is disabled).";

    var webpPpiLbl = webpTop.add("statictext", undefined, "PPI:");
    webpPpiLbl.helpTip = "Rasterization resolution used when opening the PDF for WebP export.";
    var webpPpi = webpTop.add("edittext", undefined, "300"); webpPpi.characters = 6;
    webpPpi.helpTip = webpPpiLbl.helpTip;

    var webpQLbl = webpTop.add("statictext", undefined, "Quality:");
    webpQLbl.helpTip =
      "Lossy compression strength (0–100).\n" +
      "Higher = better quality and larger files.\n" +
      "Recommended: 80–90 for portfolios.\n" +
      "Disabled if Lossless is ON.";
    var webpQ = webpTop.add("slider", undefined, 85, 0, 100);
    webpQ.preferredSize.width = 160;
    webpQ.helpTip = webpQLbl.helpTip;
    var webpQVal = webpTop.add("edittext", undefined, "85"); webpQVal.characters = 4;
    webpQVal.helpTip = webpQLbl.helpTip;

    var webpLossless = webpTop.add("checkbox", undefined, "Lossless");
    webpLossless.value = false;
    webpLossless.enabled = canWebP;
    webpLossless.helpTip =
      "Lossless WebP preserves pixels exactly.\n" +
      "Files can still be smaller than PNG, but not always.\n" +
      "If ON, the Quality slider is ignored.";

    var webpMaxLbl = webpTop.add("statictext", undefined, "Max width px (optional):");
    webpMaxLbl.helpTip =
      "Optional size cap (resamples) before WebP export.\n" +
      "Use to control file size.\nExample: 2800 or 3200.";
    var webpMaxW = webpTop.add("edittext", undefined, ""); webpMaxW.characters = 6;
    webpMaxW.helpTip = webpMaxLbl.helpTip;

    var webpGrayGroup = webpPanel.add("group");
    var webpGrayCheck = webpGrayGroup.add("checkbox", undefined, "Force grayscale on selected pages");
    webpGrayCheck.value = false; webpGrayCheck.enabled = canWebP;
    webpGrayCheck.helpTip =
      "Converts only the pages you list to grayscale.\n" +
      "This is manual. The script does not guess which pages are grayscale.";
    var webpGrayPagesLbl = webpGrayGroup.add("statictext", undefined, "Pages:");
    webpGrayPagesLbl.helpTip = "Pages list format: 3,7-10,12";
    var webpGrayPages = webpGrayGroup.add("edittext", undefined, ""); webpGrayPages.characters = 22;
    webpGrayPages.helpTip = webpGrayPagesLbl.helpTip;

    // --- AVIF ---
    var avifPanel = fmt.add("panel", undefined, "AVIF (best compression, primary)");
    avifPanel.orientation = "column";
    avifPanel.alignChildren = ["fill", "top"];
    avifPanel.helpTip =
      "AVIF is usually the smallest for visually-high-quality images when using lossy mode.\n" +
      "Lossless AVIF is not guaranteed to be smaller than lossless WebP.";

    var avifTop = avifPanel.add("group");
    var avifCheck = avifTop.add("checkbox", undefined, "Export AVIF");
    avifCheck.value = true;
    avifCheck.enabled = canAVIF;
    avifCheck.helpTip =
      canAVIF
        ? "Enable AVIF export."
        : "AVIF requires Photoshop 2025+ (this option is disabled).";

    var avifPpiLbl = avifTop.add("statictext", undefined, "PPI:");
    avifPpiLbl.helpTip = "Rasterization resolution used when opening the PDF for AVIF export.";
    var avifPpi = avifTop.add("edittext", undefined, "300"); avifPpi.characters = 6;
    avifPpi.helpTip = avifPpiLbl.helpTip;

    var avifQLbl = avifTop.add("statictext", undefined, "Quality:");
    avifQLbl.helpTip =
      "Lossy compression strength (0–100).\n" +
      "Higher = better quality and larger files.\n" +
      "Recommended: 45–60 for portfolios.\n" +
      "Disabled if Lossless is ON.";
    var avifQ = avifTop.add("slider", undefined, 50, 0, 100);
    avifQ.preferredSize.width = 160;
    avifQ.helpTip = avifQLbl.helpTip;
    var avifQVal = avifTop.add("edittext", undefined, "50"); avifQVal.characters = 4;
    avifQVal.helpTip = avifQLbl.helpTip;

    var avifLossless = avifTop.add("checkbox", undefined, "Lossless");
    avifLossless.value = false;
    avifLossless.enabled = canAVIF;
    avifLossless.helpTip =
      "Lossless AVIF preserves pixels exactly.\n" +
      "Not always smaller than lossless WebP.\n" +
      "If ON, the Quality slider is ignored.";

    var avifMaxLbl = avifTop.add("statictext", undefined, "Max width px (optional):");
    avifMaxLbl.helpTip =
      "Optional size cap (resamples) before AVIF export.\n" +
      "Use to control file size.\nExample: 2800 or 3200.";
    var avifMaxW = avifTop.add("edittext", undefined, ""); avifMaxW.characters = 6;
    avifMaxW.helpTip = avifMaxLbl.helpTip;

    var avifAdv = avifPanel.add("group");
    var chromaLbl = avifAdv.add("statictext", undefined, "Chroma:");
    chromaLbl.helpTip =
      "Color detail sampling.\n" +
      "4:4:4 = best for text/linework and colored edges.\n" +
      "4:2:2 = good compromise.\n" +
      "4:2:0 = smallest, but can soften colored edges.\n" +
      "Recommendation for portfolios: 4:4:4.";
    var chromaDrop = avifAdv.add("dropdownlist", undefined, ["4:2:0", "4:2:2", "4:4:4"]);
    chromaDrop.selection = 2;
    chromaDrop.helpTip = chromaLbl.helpTip;

    var depthLbl = avifAdv.add("statictext", undefined, "Bit depth:");
    depthLbl.helpTip =
      "8-bit is standard for web.\n" +
      "10-bit can reduce banding in smooth gradients but may be larger.\n" +
      "Recommendation: 8-bit unless you see banding.";
    var depthDrop = avifAdv.add("dropdownlist", undefined, ["8", "10", "12"]);
    depthDrop.selection = 0;
    depthDrop.helpTip = depthLbl.helpTip;

    var speedLbl = avifAdv.add("statictext", undefined, "Speed (2-10):");
    speedLbl.helpTip =
      "Encoder effort.\n" +
      "Lower = slower encode, sometimes slightly smaller/better.\n" +
      "Higher = faster encode, sometimes slightly larger.\n" +
      "Recommendation: 6 (balanced).";
    var speedField = avifAdv.add("edittext", undefined, "6"); speedField.characters = 4;
    speedField.helpTip = speedLbl.helpTip;

    var avifGrayGroup = avifPanel.add("group");
    var avifGrayCheck = avifGrayGroup.add("checkbox", undefined, "Force grayscale on selected pages");
    avifGrayCheck.value = false; avifGrayCheck.enabled = canAVIF;
    avifGrayCheck.helpTip =
      "Converts only the pages you list to grayscale.\n" +
      "This is manual. The script does not guess which pages are grayscale.";
    var avifGrayPagesLbl = avifGrayGroup.add("statictext", undefined, "Pages:");
    avifGrayPagesLbl.helpTip = "Pages list format: 3,7-10,12";
    var avifGrayPages = avifGrayGroup.add("edittext", undefined, ""); avifGrayPages.characters = 22;
    avifGrayPages.helpTip = avifGrayPagesLbl.helpTip;

    // ---------- Metadata ----------
    var metaPanel = content.add("panel", undefined, "Metadata (usually OFF for web)");
    metaPanel.orientation = "row";
    metaPanel.alignChildren = ["left", "center"];
    metaPanel.helpTip = "Embedding metadata can increase file size.\nUsually OFF for web portfolios.";

    var xmpCheck = metaPanel.add("checkbox", undefined, "XMP");
    xmpCheck.value = false;
    xmpCheck.helpTip = "Include XMP metadata (authoring info). Usually OFF for web.";

    var exifCheck = metaPanel.add("checkbox", undefined, "EXIF");
    exifCheck.value = false;
    exifCheck.helpTip = "Include EXIF metadata (camera info). Usually OFF for web portfolios.";

    var psCheck = metaPanel.add("checkbox", undefined, "Photoshop extras");
    psCheck.value = false;
    psCheck.helpTip = "Include Photoshop-specific metadata. Usually OFF for web.";

    // ---------- Progress ----------
    var prog = content.add("panel", undefined, "Progress");
    prog.orientation = "column";
    prog.alignChildren = ["fill", "top"];
    prog.helpTip = "Shows export progress.";

    var statusText = prog.add("statictext", undefined, "Idle.");
    statusText.helpTip = "Current task status.";
    var bar = prog.add("progressbar", undefined, 0, 100);
    bar.preferredSize.width = 720;
    bar.helpTip = "Progress bar.";

    // Buttons (outside scroll)
    var btns = w.add("group");
    btns.alignment = "right";
    var okBtn = btns.add("button", undefined, "Run", { name: "ok" });
    okBtn.helpTip = "Run export using the settings above.";
    var cancelBtn = btns.add("button", undefined, "Cancel", { name: "cancel" });
    cancelBtn.helpTip = "Close without exporting.";

    // Slider sync
    function syncSlider(slider, field) { field.text = String(Math.round(slider.value)); }
    function syncField(field, slider) {
      var v = clampInt(field.text, 0, 100, Math.round(slider.value));
      slider.value = v; field.text = String(v);
    }
    webpQ.onChanging = function () { syncSlider(webpQ, webpQVal); };
    webpQVal.onChange = function () { syncField(webpQVal, webpQ); };
    avifQ.onChanging = function () { syncSlider(avifQ, avifQVal); };
    avifQVal.onChange = function () { syncField(avifQVal, avifQ); };

    // Enable/disable fields (no relayout on click => no flicker)
    function updateEnablement() {
      pngPpi.enabled = pngCheck.value;
      pngMaxW.enabled = pngCheck.value;
      pngInterlace.enabled = pngCheck.value;
      pngGrayCheck.enabled = pngCheck.value;
      pngGrayPages.enabled = pngCheck.value && pngGrayCheck.value;

      var webpOn = webpCheck.value && canWebP;
      webpPpi.enabled = webpOn;
      webpLossless.enabled = webpOn;
      webpQ.enabled = webpOn && !webpLossless.value;
      webpQVal.enabled = webpOn && !webpLossless.value;
      webpMaxW.enabled = webpOn;
      webpGrayCheck.enabled = webpOn;
      webpGrayPages.enabled = webpOn && webpGrayCheck.value;

      var avifOn = avifCheck.value && canAVIF;
      avifPpi.enabled = avifOn;
      avifLossless.enabled = avifOn;
      avifQ.enabled = avifOn && !avifLossless.value;
      avifQVal.enabled = avifOn && !avifLossless.value;
      avifMaxW.enabled = avifOn;
      chromaDrop.enabled = avifOn;
      depthDrop.enabled = avifOn;
      speedField.enabled = avifOn;
      avifGrayCheck.enabled = avifOn;
      avifGrayPages.enabled = avifOn && avifGrayCheck.value;
    }

    pngCheck.onClick = updateEnablement;
    pngGrayCheck.onClick = updateEnablement;
    webpCheck.onClick = updateEnablement;
    webpLossless.onClick = updateEnablement;
    webpGrayCheck.onClick = updateEnablement;
    avifCheck.onClick = updateEnablement;
    avifLossless.onClick = updateEnablement;
    avifGrayCheck.onClick = updateEnablement;

    // Pickers
    pdfBtn.onClick = function () {
      var f = File.openDialog("Select the PDF exported from InDesign", "PDF:*.pdf");
      if (f) pdfPath.text = f.fsName;
    };
    outBtn.onClick = function () {
      var d = Folder.selectDialog("Select an output folder (script will create png/webp/avif subfolders)");
      if (d) outPath.text = d.fsName;
    };

    // Presets
    function applyPreset(which) {
      if (which === 0) {
        pngPpi.text = "250";
        webpPpi.text = "300";
        avifPpi.text = "300";
        pngMaxW.text = ""; webpMaxW.text = ""; avifMaxW.text = "";
        webpQ.value = 85; webpQVal.text = "85";
        avifQ.value = 50; avifQVal.text = "50";
        chromaDrop.selection = 2; depthDrop.selection = 0; speedField.text = "6";
        bgDrop.selection = 1;
      } else if (which === 1) {
        pngPpi.text = "200"; webpPpi.text = "250"; avifPpi.text = "250";
        pngMaxW.text = "3200"; webpMaxW.text = ""; avifMaxW.text = "";
        webpQ.value = 80; webpQVal.text = "80";
        avifQ.value = 45; avifQVal.text = "45";
        chromaDrop.selection = 1; depthDrop.selection = 0; speedField.text = "7";
        bgDrop.selection = 1;
      } else {
        pngPpi.text = "200"; webpPpi.text = "200"; avifPpi.text = "200";
        pngMaxW.text = "2800"; webpMaxW.text = "2800"; avifMaxW.text = "2800";
        webpQ.value = 75; webpQVal.text = "75";
        avifQ.value = 40; avifQVal.text = "40";
        chromaDrop.selection = 0; depthDrop.selection = 0; speedField.text = "8";
        bgDrop.selection = 1;
      }
      updateEnablement();
    }
    presetDrop.onChange = function () { applyPreset(presetDrop.selection.index); };

    updateEnablement();

    // Settings collector
    w.getSettings = function () {
      return {
        pdf: pdfPath.text ? new File(pdfPath.text) : null,
        out: outPath.text ? new Folder(outPath.text) : null,

        start: clampInt(startField.text, 1, 99999, 1),
        end: isBlank(endField.text) ? null : clampInt(endField.text, 1, 99999, 1),

        prefix: prefixField.text,
        pad: parseInt(padDrop.selection.text, 10),

        backgroundWhite: (bgDrop.selection.index === 1),

        formats: {
          png: !!pngCheck.value,
          webp: !!webpCheck.value && canWebP,
          avif: !!avifCheck.value && canAVIF
        },

        ppi: {
          png: clampInt(pngPpi.text, 1, 2400, 250),
          webp: clampInt(webpPpi.text, 1, 2400, 300),
          avif: clampInt(avifPpi.text, 1, 2400, 300)
        },

        maxW: {
          png: isBlank(pngMaxW.text) ? 0 : clampInt(pngMaxW.text, 100, 20000, 0),
          webp: isBlank(webpMaxW.text) ? 0 : clampInt(webpMaxW.text, 100, 20000, 0),
          avif: isBlank(avifMaxW.text) ? 0 : clampInt(avifMaxW.text, 100, 20000, 0)
        },

        png: {
          interlaced: !!pngInterlace.value,
          grayEnabled: !!pngGrayCheck.value,
          grayPages: pngGrayPages.text
        },

        webp: {
          lossless: !!webpLossless.value,
          quality: Math.round(webpQ.value),
          grayEnabled: !!webpGrayCheck.value,
          grayPages: webpGrayPages.text
        },

        avif: {
          lossless: !!avifLossless.value,
          quality: Math.round(avifQ.value),
          chroma: chromaDrop.selection.text,
          depth: depthDrop.selection.text,
          speed: clampInt(speedField.text, 2, 10, 6),
          grayEnabled: !!avifGrayCheck.value,
          grayPages: avifGrayPages.text
        },

        meta: { xmp: !!xmpCheck.value, exif: !!exifCheck.value, ps: !!psCheck.value },

        ui: { statusText: statusText, bar: bar }
      };
    };

    return w;
  }

  function validate(s) {
    if (!s.pdf || !s.pdf.exists) return "Please choose a valid PDF.";
    if (!s.out || !s.out.exists) return "Please choose a valid output folder.";
    if (!s.prefix) return "Prefix cannot be empty.";
    if (s.end !== null && s.end < s.start) return "End page must be blank or >= Start page.";
    if (!s.formats.png && !s.formats.webp && !s.formats.avif) return "Select at least one format.";
    if (s.formats.webp && !canWebP) return "WebP requires Photoshop 2022+.";
    if (s.formats.avif && !canAVIF) return "AVIF requires Photoshop 2025+.";
    return null;
  }

  // ------------------------- Export engine -------------------------
  function runExport(s) {
    var pngFolder = new Folder(s.out.fsName + "/png");
    var webpFolder = new Folder(s.out.fsName + "/webp");
    var avifFolder = new Folder(s.out.fsName + "/avif");
    if (s.formats.png && !pngFolder.exists) pngFolder.create();
    if (s.formats.webp && !webpFolder.exists) webpFolder.create();
    if (s.formats.avif && !avifFolder.exists) avifFolder.create();

    var pngGraySet = (s.png.grayEnabled) ? parsePageList(s.png.grayPages) : {};
    var webpGraySet = (s.webp.grayEnabled) ? parsePageList(s.webp.grayPages) : {};
    var avifGraySet = (s.avif.grayEnabled) ? parsePageList(s.avif.grayPages) : {};

    var originalDialogs = app.displayDialogs;
    var originalRulers = app.preferences.rulerUnits;
    app.displayDialogs = DialogModes.NO;
    app.preferences.rulerUnits = Units.PIXELS;

    var total = (s.end !== null) ? (s.end - s.start + 1) : null;
    if (total !== null) {
      s.ui.bar.minvalue = 0;
      s.ui.bar.maxvalue = total;
      s.ui.bar.value = 0;
    } else {
      s.ui.bar.minvalue = 0;
      s.ui.bar.maxvalue = 100;
      s.ui.bar.value = 0;
    }

    function applyGlobalAndOptional(doc, formatKey, pageNum) {
      if (s.backgroundWhite) forceWhiteBackground(doc);
      ensureSRGB8bit(doc);

      if (formatKey === "png" && pngGraySet[pageNum]) forceGrayscale(doc);
      if (formatKey === "webp" && webpGraySet[pageNum]) forceGrayscale(doc);
      if (formatKey === "avif" && avifGraySet[pageNum]) forceGrayscale(doc);

      capMaxWidth(doc, s.maxW[formatKey]);
    }

    function exportFormat(pageNum, formatKey) {
      var ppi = s.ppi[formatKey];
      var doc = openPdfPage(s.pdf, pageNum, ppi);

      applyGlobalAndOptional(doc, formatKey, pageNum);

      var baseName = s.prefix + padN(pageNum, s.pad);

      if (formatKey === "png") {
        var pngFile = new File(pngFolder.fsName + "/" + baseName + ".png");
        savePNG(doc, pngFile, s.png.interlaced);

      } else if (formatKey === "webp") {
        var webpFile = new File(webpFolder.fsName + "/" + baseName + ".webp");
        saveWebP_AM(doc, webpFile, s.webp.lossless, s.webp.quality, s.meta);

      } else if (formatKey === "avif") {
        var avifFile = new File(avifFolder.fsName + "/" + baseName + ".avif");
        saveAVIF_AM(
          doc,
          avifFile,
          s.avif.lossless,
          s.avif.quality,
          chromaToEnum(s.avif.chroma),
          depthToEnum(s.avif.depth),
          s.avif.speed,
          s.meta
        );
      }

      doc.close(SaveOptions.DONOTSAVECHANGES);
    }

    var exportedPages = 0;
    var page = s.start;

    try {
      while (true) {
        if (s.end !== null && page > s.end) break;

        s.ui.statusText.text = (s.end !== null)
          ? ("Exporting page " + page + " of " + s.end + "...")
          : ("Exporting page " + page + "...");
        s.ui.bar.value = (total !== null) ? exportedPages : (exportedPages % 100);
        app.refresh();

        // Probe page existence
        var probePpi = s.formats.png ? s.ppi.png : (s.formats.webp ? s.ppi.webp : s.ppi.avif);
        var probe = null;
        try { probe = openPdfPage(s.pdf, page, probePpi); }
        catch (eProbe) { break; }
        probe.close(SaveOptions.DONOTSAVECHANGES);

        if (s.formats.png) exportFormat(page, "png");
        if (s.formats.webp) exportFormat(page, "webp");
        if (s.formats.avif) exportFormat(page, "avif");

        exportedPages++;
        page++;
      }

      if (total !== null) s.ui.bar.value = total;
      s.ui.statusText.text = "Done. Exported pages: " + exportedPages + ".";
      alert("Done.\nExported pages: " + exportedPages);

    } finally {
      app.preferences.rulerUnits = originalRulers;
      app.displayDialogs = originalDialogs;
    }
  }

  // ------------------------- Entry -------------------------
  var ui = buildUI();
  if (ui.show() !== 1) return;

  var s = ui.getSettings();
  var err = validate(s);
  if (err) { alert(err); return; }

  runExport(s);

})();
