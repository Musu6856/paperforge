export type LandingSectionId = "features" | "model-safety" | "docs" | "cases";

export type LandingSection = {
  id: LandingSectionId;
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{
    title: string;
    description: string;
  }>;
};

export const landingSections: LandingSection[] = [
  {
    id: "features",
    eyebrow: "功能",
    title: "把理论建模拆成可推进的研究流程",
    description:
      "PaperForge 先帮助你聚焦可建模方向，再把模型设定、符号均衡和性质分析放进同一个工作台，让研究者不用在公式、格式和材料之间来回切换。",
    items: [
      {
        title: "方向聚焦",
        description:
          "从一句模糊想法生成多个可比较的研究方向，并标出更适合符号求解的默认建议。",
      },
      {
        title: "结构化研究资产",
        description:
          "每一步结果都会沉淀到右侧资产栏，方向、模型、均衡、性质和论文输出可以连续检查。",
      },
      {
        title: "一键进入下一步",
        description:
          "确认方向和模型后，可以继续生成均衡推导与性质分析，减少重复整理和手工跳转。",
      },
    ],
  },
  {
    id: "model-safety",
    eyebrow: "模型与安全",
    title: "默认模型托管，也支持自带模型 Key",
    description:
      "你可以直接使用 PaperForge 提供的默认模型，也可以在本地浏览器中配置自己的 OpenAI 或 OpenAI-compatible 模型。浏览器输入的 API Key 只用于当前请求，不会写入研究资产。",
    items: [
      {
        title: "默认模型",
        description:
          "适合快速体验完整流程，第一版优先保证方向发现、模型建立和导出的主链路可用。",
      },
      {
        title: "自有模型",
        description:
          "支持 OpenAI 和兼容接口，配置后可检测连通状态，再进入研究工作台。",
      },
      {
        title: "质量门槛",
        description:
          "符号均衡和性质分析会过滤明显不可用的草稿，避免把数值模拟或薄弱命题包装成结论。",
      },
    ],
  },
  {
    id: "docs",
    eyebrow: "文档",
    title: "当前版本的使用说明",
    description:
      "这一版文档先放在产品内，说明主流程、导出边界和模型配置方式。后续可以独立成完整帮助中心。",
    items: [
      {
        title: "主流程",
        description:
          "输入研究想法，选择方向，确认模型，生成符号均衡，再生成性质分析和 Markdown 论文草稿。",
      },
      {
        title: "导出",
        description:
          "右侧论文输出页可以预览当前资产，导出按钮会生成 Markdown 文件，便于继续写作和排版。",
      },
      {
        title: "边界",
        description:
          "PaperForge 不替代研究判断；模型设定、均衡条件和命题解释仍需要研究者检查。",
      },
    ],
  },
  {
    id: "cases",
    eyebrow: "案例",
    title: "从二手平台佣金与补贴开始",
    description:
      "案例展示一个典型双边市场问题如何从选题聚焦进入模型确认，再推进到符号均衡与性质分析。",
    items: [
      {
        title: "输入",
        description:
          "我想研究二手交易平台的佣金与补贴策略，平台应该对谁收费？",
      },
      {
        title: "方向",
        description:
          "采用双边 Hotelling 平台竞争模型，同时允许买方补贴与卖方佣金。",
      },
      {
        title: "产出",
        description:
          "沉淀变量、核心假设、一阶条件、闭式解和可导出的 Markdown 论文草稿。",
      },
    ],
  },
];
