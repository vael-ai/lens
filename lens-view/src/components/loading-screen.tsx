"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Database, Zap, BarChart3 } from "lucide-react";

const loadingSteps = [
    { icon: Database, text: "Analyzing your browsing data...", duration: 2000 },
    { icon: Brain, text: "Processing with AI intelligence...", duration: 3000 },
    { icon: Zap, text: "Identifying patterns and insights...", duration: 2500 },
    { icon: BarChart3, text: "Generating your personalized report...", duration: 2000 },
];

export function LoadingScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [stepProgress, setStepProgress] = useState(0);

    useEffect(() => {
        let progressInterval: NodeJS.Timeout;

        const startStep = (stepIndex: number) => {
            if (stepIndex >= loadingSteps.length) return;

            setCurrentStep(stepIndex);
            setStepProgress(0);

            const step = loadingSteps[stepIndex];
            if (!step) return;

            const stepDuration = step.duration;
            const progressIncrement = 100 / (stepDuration / 50); // Update every 50ms

            progressInterval = setInterval(() => {
                setStepProgress((prev) => {
                    const newProgress = prev + progressIncrement;
                    if (newProgress >= 100) {
                        clearInterval(progressInterval);

                        // Update overall progress
                        const overallProgress = ((stepIndex + 1) / loadingSteps.length) * 100;
                        setProgress(overallProgress);

                        // Start next step after a brief pause
                        setTimeout(() => startStep(stepIndex + 1), 300);

                        return 100;
                    }
                    return newProgress;
                });
            }, 50);
        };

        startStep(0);

        return () => {
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Brain className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Intelligence Report</h2>
                        <p className="text-gray-600">
                            Our AI is analyzing your browsing patterns to create personalized insights
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <Progress value={progress} className="h-2 mb-2" />
                        <p className="text-center text-sm text-gray-500">{Math.round(progress)}% Complete</p>
                    </div>

                    {/* Current Step */}
                    <div className="space-y-6">
                        {loadingSteps.map((step, index) => {
                            const IconComponent = step.icon;
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;
                            const isPending = index > currentStep;

                            return (
                                <div key={index} className="flex items-center space-x-4">
                                    <div
                                        className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isCompleted ? "bg-green-500" : isActive ? "bg-blue-500" : "bg-gray-200"}
                    ${isActive ? "animate-pulse" : ""}
                    transition-all duration-500
                  `}
                                    >
                                        <IconComponent
                                            className={`
                      h-5 w-5
                      ${isCompleted || isActive ? "text-white" : "text-gray-400"}
                    `}
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <p
                                            className={`
                      font-medium
                      ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"}
                      transition-colors duration-500
                    `}
                                        >
                                            {step.text}
                                        </p>

                                        {isActive && (
                                            <div className="mt-2">
                                                <Progress value={stepProgress} className="h-1" />
                                            </div>
                                        )}
                                    </div>

                                    {isCompleted && (
                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                            <svg
                                                className="w-4 h-4 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Fun Facts */}
                    <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <p className="text-center text-sm text-gray-600">
                            💡 <strong>Did you know?</strong> The average person visits over 100 unique websites per
                            month. Your report will reveal your unique browsing personality!
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-gray-500">
                            Powered by <strong>Vael AI</strong> & <strong>Gemini</strong>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
