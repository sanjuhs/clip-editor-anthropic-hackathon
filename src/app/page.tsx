import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Sparkles, Video, Scissors, Zap } from "lucide-react";

export default function Home() {
  const experiments = [
    {
      title: "Movie Maker Agent",
      description:
        "AI-powered video editing assistant with intelligent clip generation",
      href: "/moviemaker-agent",
      icon: Sparkles,
      status: "Active",
    },
  ];

  const features = [
    {
      icon: Video,
      title: "Multi-Format Support",
      description: "Import images, audio, and video files seamlessly",
    },
    {
      icon: Scissors,
      title: "Intelligent Clipping",
      description: "Converts 15-120 minute videos into 30-50 second clips",
    },
    {
      icon: Zap,
      title: "100% Local & Serverless",
      description:
        "All processing happens in your browser—no uploads, no servers",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-block">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
                <span className="text-xs font-mono tracking-wide">
                  EXPERIMENTAL
                </span>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Clip Editor
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Transform long-form content into viral short clips—entirely in
              your browser
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-4 pt-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <CardHeader>
                  <feature.icon className="h-8 w-8 mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="my-12" />

          {/* Experiments Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                Experiments
              </h2>
              <p className="text-muted-foreground">
                Explore cutting-edge AI video editing tools built for creators
              </p>
            </div>

            <div className="space-y-4">
              {experiments.map((experiment, index) => (
                <Link key={index} href={experiment.href}>
                  <Card className="border-border hover:border-foreground transition-all hover:shadow-lg group cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 rounded-lg bg-foreground text-background group-hover:scale-110 transition-transform">
                            <experiment.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-2xl">
                                {experiment.title}
                              </CardTitle>
                              <span className="px-2 py-1 text-xs font-mono rounded-full bg-foreground text-background">
                                {experiment.status}
                              </span>
                            </div>
                            <CardDescription className="text-base">
                              {experiment.description}
                            </CardDescription>
                          </div>
                        </div>
                        <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <Separator className="my-12" />

          {/* Technology Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                How It Works
              </h2>
              <p className="text-muted-foreground">
                Powered by cutting-edge web technologies
              </p>
            </div>

            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-mono text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Upload & Index</h3>
                      <p className="text-sm text-muted-foreground">
                        Import your media files directly in the browser. All
                        content is indexed locally using WebAssembly for
                        lightning-fast access.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-mono text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Intelligent agents analyze your content, identifying key
                        moments, emotional peaks, and viral-worthy segments.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-mono text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Generate Clips</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically create optimized 30-50 second clips
                        perfect for TikTok, Instagram Reels, and YouTube Shorts.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="pt-8 text-center">
            <Link href="/moviemaker-agent">
              <Button size="lg" className="font-semibold text-lg px-8 py-6">
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground font-mono">
            Built with Next.js · Powered by AI · 100% Client-Side
          </p>
        </div>
      </footer>
    </div>
  );
}
