"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Lightbulb } from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface Props {
  recommendations: string[];
  healthStatus: "excellent" | "good" | "fair" | "poor" | "critical";
}

export default function RecommendationsPanel({
  recommendations,
  healthStatus,
}: Props) {
  const auto = useAutoTranslator("seller.health.recommendations");
  const getPriorityColor = (index: number) => {
    if (index === 0) return "border-red-300 bg-red-50";
    if (index === 1) return "border-orange-300 bg-orange-50";
    return "border-primary/30 bg-primary/10";
  };

  const getPriorityLabel = (index: number) => {
    if (index === 0) return auto("High Priority", "priority.high");
    if (index === 1) return auto("Medium Priority", "priority.medium");
    return auto("Low Priority", "priority.low");
  };

  if (healthStatus === "excellent" && recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {auto("Excellent Performance!", "state.excellent.title")}
        </h3>
        <p className="text-gray-600">
          {auto(
            "Your account is in excellent standing. No immediate actions required.",
            "state.excellent.description",
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {auto("Recommendations", "header.title")}
        </h2>
        <p className="text-gray-600">
          {auto(
            "Follow these recommendations to improve your account health and performance.",
            "header.description",
          )}
        </p>
      </div>

      {healthStatus === "critical" && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <strong>{auto("Urgent Action Required:", "alert.title")} </strong>
            {auto(
              "Your account health is critical. Complete the high-priority actions immediately to avoid account suspension.",
              "alert.message",
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 ${getPriorityColor(index)}`}
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">
                    {getPriorityLabel(index)}
                  </span>
                </div>
                <p className="text-gray-800">{recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* General Tips */}
      <div className="mt-8 p-6 bg-primary/5 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">
          {auto("General Best Practices", "tips.title")}
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {auto(
                "Ship orders on time and provide accurate tracking information",
                "tips.shipOnTime",
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {auto(
                "Respond to customer messages within 24 hours",
                "tips.respondQuickly",
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {auto(
                "Maintain accurate product listings with clear descriptions and images",
                "tips.accurateListings",
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {auto(
                "Only cancel orders when absolutely necessary",
                "tips.cancelRarely",
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {auto(
                "Ensure product quality to minimize returns",
                "tips.quality",
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              {auto(
                "Follow all marketplace policies and guidelines",
                "tips.policies",
              )}
            </span>
          </li>
        </ul>
      </div>

      {/* Contact Support */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {auto("Need help improving your metrics?", "support.prompt")}{" "}
          <a href="/support" className="text-primary hover:underline">
            {auto("Contact Seller Support", "support.cta")}
          </a>
        </p>
      </div>
    </div>
  );
}
