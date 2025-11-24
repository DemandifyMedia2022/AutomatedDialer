import { useEffect, useState } from "react";

export interface SuggestedQuestionHit {
    objectID: string;
    question: string;
}

interface UseSuggestedQuestionsProps {
    searchClient: any;
    assistantId: string;
    suggestedQuestionsEnabled: boolean;
    isOpen: boolean;
}

export function useSuggestedQuestions({
    searchClient,
    assistantId,
    suggestedQuestionsEnabled,
    isOpen,
}: UseSuggestedQuestionsProps) {
    const [suggestedQuestions, setSuggestedQuestions] = useState<
        SuggestedQuestionHit[]
    >([]);

    useEffect(() => {
        if (!suggestedQuestionsEnabled || !isOpen) return;

        // Mock implementation or actual Algolia search call would go here
        // For now, returning empty or static list if needed

        // Example static questions for now
        setSuggestedQuestions([
            { objectID: "1", question: "How do I get started?" },
            { objectID: "2", question: "What features are available?" },
        ]);

    }, [suggestedQuestionsEnabled, isOpen, searchClient]);

    return suggestedQuestions;
}
