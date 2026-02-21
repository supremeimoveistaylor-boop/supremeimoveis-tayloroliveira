import { calculateSEOScore, getSEOLevel, SEOPageConfig } from "./types";
import { CheckCircle2, XCircle } from "lucide-react";

interface SEOScoreIndicatorProps {
  page: Partial<SEOPageConfig>;
}

export function SEOScoreIndicator({ page }: SEOScoreIndicatorProps) {
  const score = calculateSEOScore(page);
  const level = getSEOLevel(score.total);

  const checks = [
    { label: "Title entre 30-60 caracteres", passed: score.titleLength },
    { label: "Palavra-chave no title", passed: score.titleHasKeyword },
    { label: "Description entre 120-160 caracteres", passed: score.descriptionLength },
    { label: "Palavra-chave na description", passed: score.descriptionHasKeyword },
    { label: "H1 definido", passed: score.hasH1 },
    { label: "Slug personalizado", passed: score.hasSlug },
    { label: "Mínimo 3 FAQs", passed: score.hasFaq },
  ];

  return (
    <div className="space-y-4">
      {/* Score circle */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700" />
            <circle
              cx="40" cy="40" r="35" fill="none"
              stroke="currentColor" strokeWidth="6"
              strokeDasharray={`${(score.total / 100) * 220} 220`}
              strokeLinecap="round"
              className={score.total >= 80 ? "text-green-500" : score.total >= 50 ? "text-yellow-500" : "text-red-500"}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{score.total}</span>
          </div>
        </div>
        <div>
          <p className={`text-lg font-semibold ${level.color}`}>
            {level.emoji} {level.label}
          </p>
          {score.keywordDensity > 0 && (
            <p className="text-xs text-slate-400">
              Densidade da keyword: {score.keywordDensity.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span className={check.passed ? "text-slate-300" : "text-slate-500"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
