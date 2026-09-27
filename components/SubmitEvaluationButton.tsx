"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface SubmitButtonProps {
    commissionId: string;
    candidateId: string;
    scores: { code: string; value: string }[];
}

export default function SubmitEvaluationButton({ commissionId, candidateId, scores }: SubmitButtonProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Route through the same-origin proxy so the auid cookie becomes
            // X-ACTOR server-side; fall back to the public endpoint helper
            // (which itself falls back to the configured default) otherwise.
            const endpoint = '/api/graphql';
            const actor = Cookies.get('auid');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (actor) headers['X-ACTOR'] = actor;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query: `
                        mutation SubmitEval($input: SubmitEvaluationInput!) {
                            submitEvaluation(input: $input) {
                                id
                            }
                        }
                    `,
                    variables: {
                        input: { candidateId, scores }
                    }
                })
            });

            if (!response.ok) throw new Error(`GraphQL proxy responded with HTTP ${response.status}`);

            const json = await response.json();

            if (json.errors) throw new Error(json.errors[0].message);

            // Редірект у кімнату очікування
            router.push(`/commission/${commissionId}/wait`);
        } catch (error) {
            console.error("Помилка відправки:", error);
            alert("Не вдалося відправити оцінку. Спробуйте ще раз.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 active:scale-95"
        >
            {isSubmitting ? "Відправка..." : "Send Evaluation"}
        </button>
    );
}