// 文案唯一来源:docs/superpowers/specs/2026-07-05-cocoeco-copy-zh-v1.md(v2.1)
// 逐字转写;作者标记〔〕已剥离;箭头由组件渲染;口号/免责为全站单键。
import type { SceneId } from "@/scenes/registry";
import type { Lang } from "@/i18n/config";

export type KnowledgeCard = { title: string; body: string; note?: string };

export type SceneCopy = {
  menuName: string;
  seoTitle: string;
  narration: string[];
  interactionHint?: string;
  interactionFeedback?: string[];
  bigLines?: string[];
  turning?: string[];
  cards?: KnowledgeCard[];
  blocks?: { heading?: string; lines: string[] }[];
  principles?: string[];
  features?: { name: string; detail: string }[];
  featuresNote?: string;
  gates?: { name: string; desc: string }[];
  ratingLink?: string;
  interaction?: {
    prompt?: string;
    approve?: string;
    doubt?: string;
    feedbackApprove?: string;
    feedbackDoubt?: string;
  };
  claimedCount?: (n: number) => string;
  fates?: string[];
  choice?: string[];
  roadmap?: {
    heading: string;
    doneLabel: string; done: string[];
    doingLabel: string; doing: string[];
    plannedLabel: string; planned: string[];
    noteBefore: string; noteAfter: string;
  };
  actions?: { name: string; desc: string; status: string; placeholder: boolean }[];
  actionsHeading?: string;
  form?: {
    pitch: string; placeholder: string; button: string; privacy: string;
    success: string; invalid: string; failed: string;
  };
  aboutHeading?: string;
  aboutLines?: string[];
  teamHeading?: string;
  team?: { name: string; role: string; placeholder: boolean }[];
  contactHeading?: string;
  contactLines?: string[];
  email?: string;
  ctas?: { label: string; kind: "exchange" | "email" }[];
  signature?: string;
  finalCta?: string;
  transition?: string;
};

export type Dict = {
  ui: {
    brand: string; topCta: string; journeyMenu: string; language: string;
    soundOn: string; soundOff: string; readingMode: string; backToImmersive: string;
    hintScroll: string; hintTrace: string; cardClose: string;
    loading: string; loadFailed: string; retry: string; enterReading: string;
    liteMode: string; reducedMotion: string; progressAria: string;
  };
  meta: { titleBase: string; descriptionParts: [string, string]; ogImageAlt: string };
  common: { creed: [string, string, string]; disclaimer: string; ratingDisclaimer: string };
  scenes: Record<SceneId, SceneCopy>;
  footer: { rights: string };
};

const zh: Dict = {
  ui: {
    brand: "cocoeco",
    topCta: "去 carbadia.io",
    journeyMenu: "旅程",
    language: "语言",
    soundOn: "声音:开",
    soundOff: "声音:关",
    readingMode: "阅读模式(纯文字读完我的故事)",
    backToImmersive: "回到 3D 旅程",
    hintScroll: "跟我来",
    hintTrace: "你看不见我。但灯上方那缕微光,是我刚路过的地方——点它",
    cardClose: "知道了",
    loading: "三亿年都等了,不差这几秒",
    loadFailed: "这一段风景没能加载出来。你可以重试,或切换到阅读模式继续。",
    retry: "重试",
    enterReading: "进入阅读模式",
    liteMode: "已为你切换轻量模式,故事一字不少。",
    reducedMotion: "已按你的系统偏好关闭动画,故事一字不少。",
    progressAria: "旅程进度——点击跳到任意一幕",
  },

  meta: {
    titleBase: "cocoeco — 一颗碳原子的旅程",
    descriptionParts: [
      "我叫可可,一颗比太阳还老的碳原子。三个小时前,有人把我从煤里叫醒。陪我走完这段路——直到我",
      "。cocoeco:让每一吨碳都有人认领。",
    ],
    ogImageAlt: "深夜卧室,一缕微光从台灯升起,飘向半开的窗",
  },

  common: {
    creed: ["被看见", "被定价", "被认领"],
    disclaimer: "Carbadia 当前为模拟盘演示环境,不涉及真实资金或碳资产。",
    ratingDisclaimer: "示例评级仅供演示,不构成投资建议。",
  },

  scenes: {
    prologue: {
      menuName: "序幕",
      seoTitle: "我醒来的那个晚上",
      narration: [
        "我是一颗碳原子。比太阳还老。",
        "我当过大理石,当过一片浅海里的珊瑚,当过一整片石炭纪的森林。",
        "然后,我睡了三亿年。",
        "三个小时前,有人把我从煤里叫醒,送出了烟囱。",
        "现在的我,是一颗二氧化碳分子。",
        "你可以叫我——可可。",
      ],
      bigLines: [
        "这名字打哪儿来,路上我慢慢讲。",
        "旅行,我见得多了。但这一次不太一样:",
        "这条路的尽头,这个名字才真正落到账本上——连同一个价格,和一个归宿。",
      ],
      blocks: [{ lines: ["今晚,我想请你陪我走完这段路。——cocoeco"] }],
    },

    bedroom: {
      menuName: "卧室",
      seoTitle: "出发之前,看看这个亮着灯的世界",
      narration: [
        "我换上这副身体才三个小时——上一次认路,还是三亿年前。",
        "先从这扇亮着灯的窗开始:这屋里的东西,和我的同类都有些旧交情。",
      ],
      interactionHint: "房间里发亮的东西,都有一段和碳的交情——点开看看",
      cards: [
        {
          title: "台灯 · 我就是这么来的",
          body: "某座电厂正为千万盏这样的灯发电。每一度电出门,平均会带上半公斤我的同类。",
          note: "电本身很干净,脏的是发电的方式。这几年,风和太阳正在把这笔账一点点压下来。",
        },
        {
          title: "空调 · 全屋耗电冠军",
          body: "制冷和制热,是大多数家庭电表上最大的一笔。它每转一个夏天,就有几十公斤我的同类跟着上路。",
          note: "热天里,凉快不是奢侈。这笔账真正的解法,和台灯那笔一样——在电从哪儿来。",
        },
        {
          title: "外卖盒 · 石油的另一副面孔",
          body: "同一桶石油,一部分进了油箱,一部分成了餐盒。做一公斤塑料,大约有两三公斤我的同类出发。",
        },
        {
          title: "手机充电器 · 一个反直觉的事实",
          body: "它一年的账单只有一两公斤——同类里的零头。省电攻略总爱拿它开刀,其实主力根本不从这儿走。",
        },
      ],
      turning: [
        "把全球一年的账摊开,平均到每个人头上,大约是四五吨我的同类。",
        "这不是哪一个人的罪过——是一笔巨大的、还没人认领的账。",
        "走吧——带你去集合点,看看这笔账的全貌。",
      ],
      transition: "窗外,城市的灯像一片会呼吸的星海。",
    },

    city: {
      menuName: "城市",
      seoTitle: "我的同类,挤满了城市上空",
      narration: ["欢迎来到集合点。"],
      interactionHint: "城市里的光点,是我们的出发站——点开看看",
      bigLines: [
        "每年,人类活动送出约 400 亿吨我的同类。",
        "平均下来,每一秒,1200 多吨。",
      ],
      cards: [
        {
          title: "烟囱 · 主力出发站",
          body: "发电、炼钢、烧水泥——七成以上的同类从能源和工业出发。光是水泥这一种材料,就占了全球排放的约 7%。",
        },
        {
          title: "车流 · 移动的出发站",
          body: "约六分之一的同类在路上诞生:汽车、卡车、飞机、货轮——而且一年比一年多。",
        },
        {
          title: "楼群 · 两本账",
          body: "一栋楼,盖起来一笔账(钢筋水泥),住进去一笔账(供暖、制冷、照明)——加起来,约占能源相关排放的三分之一。",
        },
      ],
      turning: [
        "我们不是反派——碳是生命的原料,你也是碳做的,论辈分我们沾亲。",
        "只是,离开地下之后,我们成了**没有主人**的东西。",
        "没有主人的东西,没人心疼,也没人付账。",
      ],
      transition: "一股上升气流卷住我。城市缩成大地上的一枚电路板。",
    },

    atmosphere: {
      menuName: "大气层",
      seoTitle: "从这个高度,能看清整件事",
      narration: ["我在这颗星球上待了四十六亿年,从没在这个高度停留过。陪我看一眼。"],
      blocks: [
        {
          heading: "温室效应,两句话就能讲清:",
          lines: [
            "阳光进得来,热量出得去——这是地球本来的呼吸。",
            "而我们,恰好会拦下“出得去”的那一半。",
            "我的同类越多,这层被子就越厚。",
          ],
        },
      ],
      bigLines: [
        "大气中的二氧化碳浓度已超过 420 ppm——至少 80 万年来的最高点。",
        "与工业革命前相比,地球的长期升温已达约 1.3°C。",
      ],
      turning: [
        "(下面这几行不是我说的——是把这个网站建起来的人类写的。我替他们抄在这儿,一字没改。)",
        "我们相信,气候问题的本质,是一笔没人记的账。",
        "看不见的东西,没人在乎;",
        "没人在乎的东西,没人去解决。",
        "cocoeco 存在,是为了让每一吨碳——",
      ],
      principles: [
        "把碳的知识讲成人人听得懂的故事。(就是你正在走的这段旅程)",
        "用市场工具,让减碳的人赚钱、排碳的人付账。(下面几幕,我亲身示范)",
        "最终,每一吨碳都该有名有主。(旅程尽头,他们想邀请你)",
      ],
      transition: "我开始下坠。一片巨大的绿色,迎面而来。",
    },

    forestSea: {
      menuName: "森林与海",
      seoTitle: "这颗星球,自带一套回收系统",
      narration: [
        "每年,森林、土壤和海洋,会默默收走我们中的一半;剩下的一半留在天上。",
        "我三次路过树冠,三次没被选中。",
      ],
      interactionHint: "点一下树叶,看它收走一颗碳",
      interactionFeedback: ["年轮又厚了一圈。光合作用干活,从不吭声。"],
      cards: [
        {
          title: "树叶 · 光合作用",
          body: "一棵成年的树,一年大约收走 20 公斤我的同类。想全靠种树消化每年 400 亿吨?得有两万亿棵树全职上岗——地球现有约三万亿棵,它们还有自己的日子要过。",
        },
        {
          title: "海洋 · 沉默的巨人",
          body: "约四分之一的同类落进海里。海一直照单全收,自己却在慢慢变酸——最先遭殃的,是贝壳和珊瑚。",
        },
        {
          title: "土壤与湿地 · 地下的宝库",
          body: "地下存的碳,比天上和所有植物加起来还多。泥炭地只占陆地 3%,却锁着全球土壤碳的近三分之一——最不起眼的,往往最重要。",
        },
      ],
      turning: [
        "但这套系统快到上限了,而且它自己也会受伤——",
        "一场山火,能把攒了几十年的碳一夜退还给天空。",
        "自然需要帮手。",
        "需要有人,把这笔账认认真真记起来。",
      ],
      transition: "一片叶子把我送到一扇门前。门里灯火通明。",
    },

    market: {
      menuName: "市场",
      seoTitle: "在这里,我第一次有了价格",
      narration: ["在这颗星球上转了四十六亿年,我头一次排队——也头一次,有人为我出价。"],
      blocks: [
        {
          heading: "碳市场做的事,说穿了很简单:",
          lines: [
            "**让排碳的人付钱,让减碳的人赚钱。**",
            "排放要花钱买额度;真实的减排,能变成“碳信用”卖出去。",
            "账本一立,风向就变了。",
          ],
        },
        {
          lines: [
            "**Carbadia** 是 cocoeco 生态中的碳信用交易所。",
            "Carbadia 把交易真实减排量这件事,做得像买一杯咖啡一样简单明白。",
          ],
        },
      ],
      features: [
        { name: "订单簿现货", detail: "限价、市价随你下,价格好、来得早的先成交——资金和持仓当场两清。" },
        { name: "OTC 大宗", detail: "大额买卖一口价,可以只买一部分,起买多少卖家说了算。" },
        { name: "16 种语言", detail: "全球的账,全球人一起记。" },
      ],
      featuresNote: "了解更多:价格-时间优先撮合、资金与持仓原子结算等技术细节,见交易所文档。",
      ctas: [{ label: "去 carbadia.io,看看今天的碳价", kind: "exchange" }],
      interactionHint: "给漂过的分子贴上今天的价格",
      claimedCount: (n: number) => `已认领 ${n} 颗`,
      transition: "我揣着自己的凭证,走向下一道门。门口的牌子上,画着一枚放大镜。",
    },

    rating: {
      menuName: "评级所",
      seoTitle: "不是每张绿色证书,都一样绿",
      narration: ["这里的鉴赏家不看我,只看我身后的账——这笔减排,是真的吗?"],
      turning: [
        "碳信用市场最大的敌人,是**假装的减排**。",
        "一片本来就没人要砍的森林,不该再收一次“保护费”。",
        "分不清真假,好项目就融不到钱——这正是评级存在的意义。",
      ],
      blocks: [
        {
          lines: [
            "**CCRC · 碳信用评级鉴赏家**,Carbadia 的独立评级服务。",
            "像给债券评级那样,给每一笔碳信用评级:从 AAA 到 D,共八档,一眼看懂项目质量。",
          ],
        },
      ],
      ratingLink: "在 carbadia.io 看看评级长什么样",
      gates: [
        { name: "额外性", desc: "如果没有卖碳信用这笔钱,这片林子还会被种下吗?越是“没这笔钱就不成”,质量越高。" },
        { name: "永久性", desc: "封存的碳会不会跑回来?森林会烧,土壤会翻,岩石不会。" },
        { name: "重复计算", desc: "同一吨减排,只能被认领一次。两本账写同一笔功劳,等于没记账。" },
        { name: "协同效益", desc: "好项目不止减碳:还给鸟留了林子,给村庄留了工作。" },
      ],
      interaction: {
        prompt: "轮到你了——给这个项目盖章:",
        approve: "通过",
        doubt: "存疑",
        feedbackApprove: "鉴赏家点点头:这笔减排,是真的。",
        feedbackDoubt: "好眼力——分辨真假,正是评级所每天在做的事。",
      },
      transition: "我的凭证上落下一枚 AAA 印章。前方,天开始亮了。",
    },

    rebirth: {
      menuName: "新生",
      seoTitle: "我的旅程,有了一个结局",
      narration: ["被认领的同类,各有各的归宿。"],
      fates: [
        "有的进了新种下的树,长成年轮里的一圈;",
        "有的被机器捕捉,注入玄武岩,矿化成石头;",
        "有的走进实验室,变成新的燃料与材料,再活一次。",
      ],
      choice: ["我选了岩石。", "我打算在地下,再睡上一亿年。", "——这一次,是我自己选的。"],
      roadmap: {
        heading: "cocoeco 接下来要做的事:",
        doneLabel: "已上线",
        done: ["carbadia.io 模拟盘交易所", "16 种语言开放"],
        doingLabel: "进行中",
        doing: ["cocoeco 故事官网(你正在看)", "CCRC 评级方法论打磨", "社区计划筹备"],
        plannedLabel: "规划中",
        planned: ["个人碳足迹小工具", "校园与企业科普合作", "把真实碳信用合规地接进来"],
        noteBefore: "规划会变,方向不变——让每一吨碳",
        noteAfter: "。",
      },
      transition: "黎明。山丘上有一堆篝火,和一群还醒着的人。",
    },

    camp: {
      menuName: "营地",
      seoTitle: "还有亿万个同类,在等一个名字",
      narration: [
        "送我回家,用了一整个市场。",
        "送亿万个同类回家,需要更多一起记账的人。",
        "篝火边正好有个空位——不催,你可以先坐下烤烤火。",
      ],
      actionsHeading: "cocoeco 正在筹备的行动:",
      actions: [
        { name: "绿色周末", desc: "城市植树与海滩清理,和邻居一起动手。", status: "筹备中", placeholder: true },
        { name: "碳知识开放课", desc: "把这段旅程做成课件,免费给学校用。", status: "筹备中", placeholder: true },
        { name: "开放数据", desc: "把碳市场数据开放给开发者与研究者。", status: "筹备中", placeholder: true },
      ],
      form: {
        pitch: "想第一个知道?留下邮箱,行动上线时告诉你。",
        placeholder: "你的邮箱",
        button: "算我一个",
        privacy: "只用来通知行动上线,不发广告。",
        success: "收到。行动上线时,第一时间通知你。",
        invalid: "这个邮箱好像写错了,再看一眼?",
        failed: "没发出去——网络出了点状况,稍后再试一次?",
      },
      aboutHeading: "关于 cocoeco",
      aboutLines: [
        "cocoeco 的名字,是 **coco + eco**:",
        "coco,是他们给我起的呼号——我是第一颗被他们完整记账的碳原子;",
        "eco,是我一直想回去的家。",
        "他们是一群相信“记账能改变世界”的人——",
        "白天,建碳市场的基础设施;",
        "晚上,讲碳的故事。",
      ],
      teamHeading: "团队",
      team: [
        { name: "待公布", role: "创始人 / 碳市场", placeholder: true },
        { name: "待公布", role: "工程", placeholder: true },
        { name: "待公布", role: "设计", placeholder: true },
        { name: "待公布", role: "运营", placeholder: true },
      ],
      contactHeading: "联系我们",
      contactLines: ["聊碳市场、谈合作、来入伙,或者只是想说一句“我陪可可走完了”:"],
      email: "hello@cocoeco.io",
      ctas: [
        { label: "去 carbadia.io 看看", kind: "exchange" },
        { label: "写信给我们", kind: "email" },
      ],
      transition: "篝火渐远。一扇熟悉的窗,亮起了晨光。",
    },

    dawn: {
      menuName: "黎明",
      seoTitle: "回家",
      narration: [
        "还是那间卧室,还是那盏灯。",
        "只是这一次,点亮它的电,来自三百公里外的一阵风。",
        "我在一块岩石里,做着很长的梦。",
        "梦里,每一个同类都有名字、有价格、有人认领。",
        "这不该只是一个梦。",
        "这是一笔值得用很多年,认真去记的账。",
      ],
      signature: "—— 可可,以及 cocoeco 的人类们",
      finalCta: "跟他们一起记账",
    },
  },

  footer: { rights: "© 2026 cocoeco" },
};

export const dictionary = { zh } as const;

export function resolveDict(lang: Lang): Dict {
  void lang; // M8 接入其余 15 语后按 lang 分发
  return dictionary.zh;
}
