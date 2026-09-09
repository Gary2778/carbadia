export type StudioLocale = "en" | "zh-TW";
export type TechnologyKind = "capture" | "fuels" | "conversion" | "synthesis" | "flexible";

export interface StudioTechnology {
  id: string;
  name: string;
  kind: TechnologyKind;
  category: string;
  summary: string;
  ambition: string;
  questions: string[];
  boundary: string;
  nextStep: string;
  reference: { title: string; href: string };
}

const en = {
  locale: "en" as StudioLocale,
  nav: { direction: "Our direction", technology: "Technologies", funding: "Investment", progress: "Progress", partnerships: "Work with us" },
  hero: {
    title: "Carbadia Studio",
    description: "Building the foundations for proprietary carbon dioxide removal (CDR) technologies, renewable synthetic fuels and chemical process development.",
  },
  direction: {
    label: "Our direction",
    title: "Carbon dioxide removal is our research priority.",
    description: "Our long-term ambition is to develop proprietary processes for carbon dioxide removal, then build a broader portfolio of technologies, products and industrial projects.",
    investment: "Discuss an investment",
    explore: "Explore the technologies",
    stageLabel: "Where we are today",
    stage: "Seeking initial investment",
    stageText: "We are setting the development direction. Initial funding would support a technical team, priority route selection and the first phase of research and experimental validation.",
    pillars: [
      { title: "Proprietary processes", text: "Work towards proprietary process know-how, validated technologies and an intellectual property portfolio." },
      { title: "A broader product portfolio", text: "Prioritise carbon dioxide removal, with CO₂ utilisation, synthetic fuels and industrial projects as future development areas." },
      { title: "China and international markets", text: "Aim to build long-term research, industry and public-sector relationships, shaped by local knowledge and needs." },
    ],
  },
  technologies: {
    title: "Technology development",
    intro: "Direct air capture is the intended research priority, alongside future work on CO₂ utilisation, fuel synthesis and flexible operation of chemical processes. Specific processes and project sites remain to be defined.",
    priority: "Priority research direction",
    future: "Future development area",
    read: "Explore this direction",
    ambition: "The intended application",
    questions: "Research questions",
    boundary: "Technical scope and assessment",
    next: "The next research step",
    close: "Close technology details",
    inquire: "Discuss this technology",
    reference: "Background reading",
    referenceNote: "Independent research context for this direction.",
    items: [
      {
        id: "direct-air-capture", kind: "capture", name: "Direct air capture (DAC)", category: "Atmospheric CO₂ capture",
        summary: "Explore the separation of CO₂ from ambient air, focusing on capture materials, regeneration energy and integration with long-term CO₂ storage.",
        ambition: "Develop proprietary capture processes that could be integrated with low-emission energy supply, CO₂ transport and long-term storage. Future project design would include monitoring and net CO₂ removal accounting.",
        questions: ["Which capture materials and process configurations merit experimental investigation?", "How could regeneration energy requirements and overall specific energy consumption be reduced?", "How would cyclic stability, capture efficiency and net CO₂ removal be quantified?"],
        boundary: "DAC must be combined with long-term CO₂ storage to deliver carbon dioxide removal. Net removal must account for life cycle greenhouse gas emissions from capture, energy supply, transport and storage.",
        nextStep: "With initial funding, establish technical leadership, compare candidate routes and define a focused experimental programme before selecting a process to develop.",
        reference: { title: "IEA · Direct air capture", href: "https://www.iea.org/reports/direct-air-capture-2022/executive-summary" },
      },
      {
        id: "renewable-fuels", kind: "fuels", name: "Renewable synthetic fuels (e-fuels)", category: "Electricity-based fuel synthesis",
        summary: "Explore e-fuel production using hydrogen from water electrolysis powered by renewable electricity, with captured CO₂ as a feedstock for carbon-containing fuels.",
        ambition: "Investigate integrated production of synthetic fuels for aviation, shipping and industry, from electricity supply and water electrolysis to fuel synthesis, product upgrading and end-use requirements.",
        questions: ["Which fuel and end use offer a clear project focus?", "Which electricity supply, electrolysis technology and feedstocks fit the intended synthesis pathway?", "What would life cycle assessment, fuel specifications and a reliable supply chain require?"],
        boundary: "Using captured CO₂ to make fuel does not constitute durable CO₂ removal. Any emissions reduction must be established through life cycle assessment (LCA), including electricity supply, CO₂ origin and fuel combustion.",
        nextStep: "Work with prospective technical and industrial partners to compare product pathways and identify a defined feasibility-study opportunity.",
        reference: { title: "IEA · The role of e-fuels in transport", href: "https://www.iea.org/reports/the-role-of-e-fuels-in-decarbonising-transport" },
      },
      {
        id: "co2-conversion", kind: "conversion", name: "Carbon dioxide reduction", category: "CO₂ utilisation",
        summary: "Explore electrochemical CO₂ reduction and thermocatalytic CO₂ hydrogenation as routes to fuels, chemical products and synthesis intermediates.",
        ambition: "Investigate catalytic pathways to products such as carbon monoxide, formic acid or formate, and methanol. The target product and reaction pathway would be selected through technical evaluation.",
        questions: ["Which target product, catalyst and reaction pathway should be prioritised?", "How do product selectivity, catalyst stability and specific energy consumption vary with operating conditions?", "What feedstock purification, product separation and downstream processing would be needed?"],
        boundary: "CO₂ reduction refers to a chemical reaction, not a measured reduction in greenhouse gas emissions. Climate benefits require life cycle assessment of energy inputs, feedstocks, product use and the conventional production pathway being displaced.",
        nextStep: "Identify a target product with prospective research and industry partners, then define the measurements needed to assess a candidate route.",
        reference: { title: "RSC · CO₂ hydrogenation and electrocatalytic reduction", href: "https://pubs.rsc.org/en/content/articlelanding/2020/cc/d0cc04310a" },
      },
      {
        id: "fischer-tropsch", kind: "synthesis", name: "New Fischer–Tropsch synthesis", category: "Catalysis and reactor engineering",
        summary: "Explore catalyst and reactor development for converting synthesis gas (syngas), principally carbon monoxide and hydrogen, into hydrocarbons.",
        ambition: "Investigate catalyst performance, heat management and process integration for synthetic fuel production, including upstream syngas preparation and downstream hydrocarbon upgrading.",
        questions: ["Which catalyst, reactor design or process-integration improvement offers a defined research focus?", "How could hydrocarbon selectivity, product distribution and target-fuel yield be improved?", "How should heat recovery, syngas composition and product upgrading be integrated?"],
        boundary: "Fischer–Tropsch synthesis is an established catalytic process and is not inherently renewable. Any proposed innovation must be supported by experimental evidence; life cycle emissions depend on the feedstocks, energy supply and complete production pathway.",
        nextStep: "Scope a research question with specialists and identify the experimental evidence needed before making process-performance claims.",
        reference: { title: "KIT Energy Lab · Power-to-liquid processes", href: "https://www.elab2.kit.edu/english/power2liquid.php" },
      },
      {
        id: "flexible-production", kind: "flexible", name: "Flexible operation of chemical processes", category: "Process systems engineering",
        summary: "Explore how chemical processes can adapt to variable renewable electricity through load flexibility, energy and material storage, and process control.",
        ambition: "Investigate dynamic operation and integrated process design for chemical production under a variable energy supply, including operating-load limits, ramp rates and buffer storage.",
        questions: ["What operating-load range and ramp rates are feasible for each process unit?", "How should energy storage and intermediate-product buffers be sized and coordinated?", "How do load changes and start-up or shutdown cycles affect safety, efficiency, equipment life and product quality?"],
        boundary: "Flexible operation must be validated for a specific process and its operating constraints. Changes in electricity supply may require buffering between electrolysis, synthesis and separation rather than direct load-following by every unit.",
        nextStep: "Select a representative process and use dynamic process modelling to assess operating scenarios before defining an experimental validation programme.",
        reference: { title: "KIT · Energy flexibilization and demand response in power-to-methanol", href: "https://publikationen.bibliothek.kit.edu/1000192334" },
      },
    ] as StudioTechnology[],
  },
  funding: {
    title: "What initial investment would support",
    intro: "Establish the people, research and evidence needed to pursue proprietary technology. The first phase would focus on a defined route and a practical validation programme.",
    action: "Discuss the development plan",
    items: [
      { title: "Build the technical team", text: "Recruit technical leadership and establish research and engineering collaborations." },
      { title: "Select a priority process", text: "Compare candidate routes, define research questions and assess initial feasibility." },
      { title: "Begin experimental validation", text: "Develop a test programme and evaluate process performance, energy requirements and life cycle environmental impacts." },
      { title: "Prepare for project development", text: "Explore intellectual-property strategy, independent review and suitable demonstration partners." },
    ],
  },
  progress: {
    title: "Development progress",
    intro: "A clear view of the current stage and the work we plan to pursue. We will share evidence as that work is completed.",
    stages: [
      { timing: "Today", title: "Define the direction", text: "Establishing the development focus and seeking initial investment.", status: "Current stage", current: true },
      { timing: "With initial funding", title: "Build and validate", text: "Form the technical team, select a route and begin research and experimental work.", status: "Planned", current: false },
      { timing: "Following validation", title: "Prepare a demonstration", text: "Evaluate a demonstration opportunity with defined partners, project scope and evidence requirements.", status: "Future stage", current: false },
    ],
    updates: "Future updates will cover the team, research route, experimental findings and confirmed project roles.",
  },
  partnerships: {
    title: "Investment and partnerships",
    intro: "We are looking for people and organisations who want to help build this direction, from the first research questions to future industrial projects.",
    routes: [
      { topic: "investment", title: "Investment", text: "Discuss the long-term direction, initial funding priorities and the work needed to establish technical capability.", action: "Discuss an investment" },
      { topic: "research", title: "Research and engineering", text: "Bring expertise in CO₂ capture materials, catalysis, reaction engineering, process control or life cycle assessment.", action: "Explore a research collaboration" },
      { topic: "industry", title: "Industry and public-sector collaboration", text: "Explore local development needs, future product demand, demonstration opportunities and potential project roles.", action: "Explore a project partnership" },
    ],
    buildTitle: "Bring your own project idea",
    buildText: "Founders and smaller companies can bring a technology, a site or an industrial need. Explore how a future project could take shape together.",
    buildAction: "Discuss your project",
  },
  community: { title: "Community projects", description: "A little more care for the world we share.", status: "Coming soon" },
  inquiry: {
    title: "Start a conversation",
    intro: "Tell us how you would like to participate: investment, technical expertise, an industrial application or a project idea.",
    topic: "I’d like to discuss", company: "Organisation", optional: "Optional", companyPlaceholder: "Your company or team",
    message: "Your message", messagePlaceholder: "Share your interest, relevant expertise or the opportunity you would like to explore.",
    prepare: "Prepare an email", note: "Create a draft to review and send from your email app.",
    ready: "Your conversation starter is ready.", readyNote: "Review your message below, then open it in your email app to send it to Carbadia.",
    open: "Open email draft", edit: "Edit message", direct: "You can also reach us directly:", error: "Add a short message.",
    options: [
      { value: "investment", label: "Investment in Carbadia Studio" },
      { value: "research", label: "Research and engineering collaboration" },
      { value: "industry", label: "Industry partnership" },
      { value: "public-sector", label: "Public-sector collaboration" },
      { value: "direct-air-capture", label: "Direct air capture (DAC)" },
      { value: "renewable-fuels", label: "Renewable synthetic fuels (e-fuels)" },
      { value: "co2-conversion", label: "Carbon dioxide reduction" },
      { value: "fischer-tropsch", label: "New Fischer–Tropsch synthesis" },
      { value: "flexible-production", label: "Flexible operation of chemical processes" },
      { value: "new-project", label: "My own project" },
    ],
  },
};

export type StudioContent = typeof en;

const zhTW: StudioContent = {
  locale: "zh-TW",
  nav: { direction: "發展方向", technology: "技術開發", funding: "初始投資", progress: "開發進展", partnerships: "投資與合作" },
  hero: {
    title: "Carbadia Studio",
    description: "為自主二氧化碳移除（CDR）技術、可再生電力合成燃料與化工過程研發，建立長期發展基礎。",
  },
  direction: {
    label: "發展方向", title: "以二氧化碳移除為研發重點。",
    description: "我們的長期目標是開發具有自主智慧財產權的二氧化碳移除工藝，逐步形成更豐富的技術、產品與產業專案組合。",
    investment: "討論投資", explore: "探索技術方向",
    stageLabel: "目前的階段", stage: "尋求初始投資",
    stageText: "我們正在確立發展方向。初始資金將用於支持技術團隊、優先技術路線的選擇，以及第一階段的研究與實驗驗證。",
    pillars: [
      { title: "自主核心工藝", text: "逐步積累工藝專有技術、形成經驗證的技術成果，並建立智慧財產權布局。" },
      { title: "更豐富的產品組合", text: "以二氧化碳移除為優先方向，將 CO₂ 資源化利用、合成燃料與產業專案納入未來發展範圍。" },
      { title: "中國與國際市場", text: "結合當地知識與需求，逐步建立長期的科研、產業及公部門合作關係。" },
    ],
  },
  technologies: {
    title: "技術開發",
    intro: "以直接空氣捕集為優先研究方向，並規劃 CO₂ 資源化利用、燃料合成及化工過程柔性運行的後續研究。具體工藝與專案場址仍有待確定。",
    priority: "優先研究方向", future: "未來發展方向", read: "探索這個方向",
    ambition: "預期應用", questions: "研究問題", boundary: "技術範圍與評估", next: "下一個研究步驟",
    close: "關閉技術詳情", inquire: "討論這項技術", reference: "延伸閱讀", referenceNote: "用於理解這個方向的獨立研究資料。",
    items: [
      {
        ...en.technologies.items[0], name: "直接空氣捕集（DAC）", category: "大氣 CO₂ 捕集",
        summary: "探索從環境空氣中分離 CO₂ 的工藝，聚焦捕集材料、再生能耗，以及與 CO₂ 長期封存的整合。",
        ambition: "開發可與低排放能源供應、CO₂ 運輸及長期封存整合的自主捕集工藝。未來專案設計將納入監測與 CO₂ 淨移除量核算。",
        questions: ["哪些捕集材料與工藝配置值得進行實驗研究？", "如何降低再生能耗與整體單位能耗？", "如何量化循環穩定性、捕集效率與 CO₂ 淨移除量？"],
        boundary: "DAC 需與 CO₂ 長期封存結合，才能實現二氧化碳移除。淨移除量核算需計入捕集、能源供應、運輸及封存環節的生命週期溫室氣體排放。",
        nextStep: "在取得初始資金後，組建核心技術團隊、比較候選技術路線，並在選定開發工藝前規劃明確的實驗研究計畫。",
      },
      {
        ...en.technologies.items[1], name: "可再生電力合成燃料（e-fuels）", category: "電力驅動的燃料合成",
        summary: "探索以可再生電力驅動水電解製氫，再以氫氣合成燃料的路線；含碳燃料以捕集的 CO₂ 作為碳源。",
        ambition: "面向航空、航運及產業用途，研究從電力供應、水電解、燃料合成到產品提質與終端應用要求的一體化生產路線。",
        questions: ["哪一種燃料與最終用途能形成清楚的專案重點？", "哪些電力供應、水電解技術與原料適合預期合成路線？", "生命週期評估、燃料規格與可靠供應鏈需要哪些條件？"],
        boundary: "利用捕集的 CO₂ 製造燃料，不構成持久的 CO₂ 移除。減排效益需透過生命週期評估（LCA）確認，納入電力供應、CO₂ 來源及燃料燃燒等環節。",
        nextStep: "與潛在技術及產業夥伴比較產品路線，找出範圍明確的可行性研究機會。",
      },
      {
        ...en.technologies.items[2], name: "二氧化碳還原", category: "CO₂ 資源化利用",
        summary: "探索 CO₂ 電化學還原與熱催化加氫，用於製備燃料、化學品及化學合成中間體。",
        ambition: "研究製備一氧化碳、甲酸或甲酸鹽、甲醇等產品的催化路線。目標產品與反應路線將透過技術評估確定。",
        questions: ["應優先研究哪一種目標產品、催化劑與反應路線？", "產物選擇性、催化劑穩定性與單位能耗如何隨操作條件變化？", "需要哪些原料淨化、產品分離及下游加工步驟？"],
        boundary: "CO₂ 還原指化學還原反應，不等同於溫室氣體減排。氣候效益需透過生命週期評估確認，涵蓋能源投入、原料、產品用途及所替代的傳統生產路線。",
        nextStep: "與潛在科研及產業夥伴確定目標產品，再定義評估候選路線所需的測量工作。",
      },
      {
        ...en.technologies.items[3], name: "新型費托合成", category: "催化與反應器工程",
        summary: "探索將合成氣轉化為烴類的催化劑與反應器技術；合成氣的主要成分為一氧化碳與氫氣。",
        ambition: "研究合成燃料生產中的催化劑性能、熱管理與工藝整合，包括上游合成氣製備及下游烴類產品提質。",
        questions: ["哪一項催化劑、反應器設計或工藝整合改進能形成明確的研究重點？", "如何改善烴類選擇性、產物分布與目標燃料收率？", "如何整合熱回收、合成氣組成與產品提質？"],
        boundary: "費托合成是成熟的催化工藝，本身不限定使用可再生原料。擬研究的創新需由實驗證據支持；生命週期排放則取決於原料、能源供應及完整生產路線。",
        nextStep: "與專業團隊界定研究問題，並在提出工藝性能主張前，確定所需的實驗證據。",
      },
      {
        ...en.technologies.items[4], name: "化工過程柔性運行", category: "化工系統工程",
        summary: "透過負荷調節、能源與物料儲存及過程控制，探索化工過程適應可再生電力波動的運行方式。",
        ambition: "研究變動能源供應下的化工過程動態運行與一體化設計，包括運行負荷範圍、負荷變化速率及緩衝儲存。",
        questions: ["各工藝單元可接受的負荷範圍與負荷變化速率是多少？", "如何確定儲能與中間產品緩衝的規模，並協調其運行？", "負荷變化及啟停循環如何影響安全性、效率、設備壽命與產品品質？"],
        boundary: "柔性運行需針對具體工藝及其操作約束進行驗證。面對電力供應變化，電解、合成與分離環節之間可能需要緩衝，不能預設所有單元都能直接跟隨負荷變化。",
        nextStep: "選擇具有代表性的工藝，透過化工過程動態建模評估運行情境，再制定實驗驗證計畫。",
      },
    ],
  },
  funding: {
    title: "初始投資將支持什麼",
    intro: "建立自主技術所需的人才、研究與證據。第一階段將聚焦明確的工藝路線，以及可執行的驗證計畫。",
    action: "討論開發計畫",
    items: [
      { title: "組建技術團隊", text: "引入技術負責人，建立科研與工程合作。" },
      { title: "選擇優先工藝", text: "比較候選路線、確定研究問題，並評估初步可行性。" },
      { title: "啟動實驗驗證", text: "制定測試計畫，評估工藝性能、能源需求與生命週期環境影響。" },
      { title: "準備專案開發", text: "研究智慧財產策略、獨立評估，以及合適的示範夥伴。" },
    ],
  },
  progress: {
    title: "開發進展", intro: "清楚呈現目前階段與計畫中的工作，隨著工作完成逐步分享證據。",
    stages: [
      { timing: "現在", title: "確立發展方向", text: "正在確立開發重點，並尋求初始投資。", status: "目前階段", current: true },
      { timing: "取得初始資金後", title: "建立能力與驗證", text: "組建技術團隊、選擇路線，並啟動研究與實驗工作。", status: "計畫中", current: false },
      { timing: "驗證之後", title: "準備示範專案", text: "與職責明確的夥伴評估示範機會，界定專案範圍及證據要求。", status: "未來階段", current: false },
    ],
    updates: "未來將逐步更新團隊、研究路線、實驗成果，以及已確認的專案職責。",
  },
  partnerships: {
    title: "投資與合作", intro: "從第一個研究問題，到未來的產業專案，我們期待與希望共同建設這個方向的個人及機構展開討論。",
    routes: [
      { topic: "investment", title: "投資", text: "討論長期方向、初始資金重點，以及建立技術能力所需的工作。", action: "討論投資" },
      { topic: "research", title: "科研與工程", text: "帶來 CO₂ 捕集材料、催化、反應工程、過程控制或生命週期評估的專業經驗。", action: "探索研究合作" },
      { topic: "industry", title: "產業與公部門合作", text: "探索當地發展需求、未來產品需求、示範機會及可能的專案職責。", action: "探索專案合作" },
    ],
    buildTitle: "帶著自己的專案構想來", buildText: "創業者與小型企業可以帶來一項技術、一個場址或產業需求，一起探索未來專案如何逐步成形。", buildAction: "討論你的專案",
  },
  community: { title: "公益專案", description: "為我們共同生活的世界，多一份關懷。", status: "Coming soon" },
  inquiry: {
    title: "開始一段討論", intro: "告訴我們你希望如何參與：投資、技術專長、產業應用，或一個專案構想。",
    topic: "我想討論", company: "企業或團隊", optional: "選填", companyPlaceholder: "你的企業或團隊名稱",
    message: "你的訊息", messagePlaceholder: "分享你的合作意向、相關專長，或希望探索的機會。",
    prepare: "整理郵件草稿", note: "產生草稿後，由你審閱並在郵件應用程式中寄出。",
    ready: "你的討論草稿已準備好。", readyNote: "請先審閱以下訊息，再開啟郵件應用程式寄給 Carbadia。",
    open: "開啟郵件草稿", edit: "編輯訊息", direct: "也可以直接聯絡我們：", error: "請填寫簡短訊息。",
    options: [
      { value: "investment", label: "投資 Carbadia Studio" },
      { value: "research", label: "科研與工程合作" },
      { value: "industry", label: "產業合作" },
      { value: "public-sector", label: "公部門合作" },
      { value: "direct-air-capture", label: "直接空氣捕集（DAC）" },
      { value: "renewable-fuels", label: "可再生電力合成燃料（e-fuels）" },
      { value: "co2-conversion", label: "二氧化碳還原" },
      { value: "fischer-tropsch", label: "新型費托合成" },
      { value: "flexible-production", label: "化工過程柔性運行" },
      { value: "new-project", label: "開發我的專案" },
    ],
  },
};

export function getStudioContent(locale: StudioLocale): StudioContent {
  return locale === "zh-TW" ? zhTW : en;
}
