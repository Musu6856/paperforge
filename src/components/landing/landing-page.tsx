import Link from "next/link";
import { ArrowRight, Braces, KeyRound, PenLine } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductPreview } from "./product-preview";
import { SiteHeader } from "./site-header";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-[520px_minmax(0,1fr)] lg:py-16">
          <div className="max-w-xl">
            <h1 className="font-serif text-5xl font-semibold leading-[1.12] tracking-tight text-foreground md:text-6xl">
              从模糊选题到
              <br />
              可求解的博弈论模型
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              为中文经济学与管理科学研究者打造的理论建模工作台。先发现方向，再共创模型，最后进入符号均衡求解与性质分析。
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/launch"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 gap-2 px-7 text-base"
                )}
              >
                开始研究
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#example"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-12 px-5 text-base"
                )}
              >
                查看示例研究
              </a>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section
          id="features"
          className="border-t bg-card/45 px-5 py-14"
        >
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
            <Feature
              icon={<PenLine className="size-4" />}
              title="从问题开始"
              text="用户只需要给出研究兴趣，系统先帮你生成可建模的方向，而不是把空表格丢给你。"
            />
            <Feature
              icon={<Braces className="size-4" />}
              title="符号推导优先"
              text="均衡解必须是解析表达，数值代入只会出现在未来仿真模块，不进入性质分析。"
            />
            <Feature
              icon={<KeyRound className="size-4" />}
              title="模型来源可选"
              text="可以使用 PaperForge 提供的模型，也可以在浏览器本地配置自己的 OpenAI 或 Anthropic 兼容接口。"
            />
          </div>
        </section>

        <section id="example" className="px-5 py-14">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t pt-10 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-primary">
                Example
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">
                二手交易平台的佣金与补贴策略
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              一个典型流程会先从“二手交易平台收费策略”扩展出双边 Hotelling、质量认证、卖家多归属、绿色再流通等方向；采用方向后，再沉淀假设、效用函数和可继续求解的均衡框架。
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="mb-4 flex size-8 items-center justify-center rounded-md bg-accent text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
