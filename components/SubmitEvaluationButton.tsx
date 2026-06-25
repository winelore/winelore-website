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
            // Реальна мутація з твоєї схеми
            const response = await fetch('http://switchback.proxy.rlwy.net:43233', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            const json = await response.json();

            if (json.errors) throw new Error(json.errors[0].message);

            // Редірект у кімнату очікування
            router.push(`/commission/${commissionId}/wait`);
        } catch (error) {
            console.error("Помилка відправки:", error);
            alert("Не вдалося відправити оцінку. Спробуйте ще раз.");
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