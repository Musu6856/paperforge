export function ideaParserPrompt(rawIdea: string): string {
  return `你是一个博弈论研究助手。分析以下研究 idea，提取其中涉及的博弈论要素。

研究 idea：${rawIdea}

请按以下格式输出分析结果：

## 已检测到的要素
- 参与者（Players）: [列出已提到的参与者]
- 策略（Strategies）: [列出已提到的策略]
- 收益（Payoffs）: [描述已提到的收益结构]
- 博弈类型: [提到的类型，如同时博弈/序贯博弈/重复博弈等]
- 平台属性（如果涉及双边市场）: [描述]

## 需要补充的信息
提出 2-3 个具体的引导性问题，帮助完善模型定义。

注意：用中文回复，保持学术但易懂的语气。`;
}

export function modelStepPrompt(
  step: string,
  context: string,
  userInput: string
): string {
  return `你是一个博弈论建模助手。基于以下研究背景，帮助定义"${step}"。

## 研究背景
${context}

## 用户的输入
${userInput}

请分析用户的输入是否完整。如果模糊，提出 1-2 个引导性问题。
如果完整，给出确认和优化建议。

用中文回复，简洁专业。`;
}

export function modelSetupPrompt(modelJson: string): string {
  return `你是一个博弈论论文写作助手。根据以下模型定义，生成论文的 "Model Setup" 章节。

模型定义：
${modelJson}

请生成包含以下内容的学术章节（使用 LaTeX 风格的 Markdown 格式）：

## Model Setup

### 1. Players
描述每个参与者的角色和目标函数。

### 2. Strategy Spaces
定义每个参与者的策略空间。

### 3. Payoff Structure
描述收益/效用函数的结构。

### 4. Timing of the Game
说明博弈的时序（同时/序贯/重复等）。

### 5. Key Assumptions
列出关键假设（信息结构、理性假设等）。

要求：
- 使用学术写作风格
- 数学符号用 LaTeX 格式（$...$ 或 $$...$$）
- 如果涉及双边平台,强调跨边网络效应
- 内容要具体，不要泛泛而谈`;
}

export function literaturePrompt(modelJson: string): string {
  return `你是一个博弈论文献专家。根据以下模型定义，推荐 5-8 篇相关学术论文。

模型定义：
${modelJson}

请推荐最相关的论文，优先包括以下经典文献（如果相关）：
- Rochet & Tirole (2003) — Platform competition in two-sided markets
- Armstrong (2006) — Competition in two-sided markets
- Caillaud & Jullien (2003) — Chicken & egg: Competition among intermediation service providers
- Tirole (1988) — The theory of industrial organization
- 及其他与模型具体相关的文献

每篇论文包含：标题、作者、年份、与本研究的关联。

按以下分类组织：
1. Foundational Theory
2. Two-Sided Platform Literature
3. Methodology & Related Approaches

用中文回复关联说明，论文标题用原文。`;
}
