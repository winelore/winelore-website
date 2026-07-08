'use server';

/**
 * Helper function to execute raw GraphQL queries/mutations directly on the backend.
 * Running this on the server side completely bypasses browser CORS restrictions.
 */
async function executeGraphQL(query: string, variables: any) {
    const response = await fetch('http://hayabusa.proxy.rlwy.net:21675/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        // Disable caching for mutations to guarantee fresh state execution
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
    }
    return json.data;
}

/**
 * Server Action that handles the cascade generation of the entire competition infrastructure.
 */
export async function createCompetitionInfrastructure(formData: any) {
    try {
        // 1. Initialize the core Competition node with the required holders array
        const createCompetitionMutation = `
            mutation CreateCompetition($input: CreateCompetitionInput!) {
                createCompetition(input: $input) { id }
            }
        `;
        const competitionResult = await executeGraphQL(createCompetitionMutation, {
            input: {
                name: formData.name,
                seriesId: formData.seriesId ? formData.seriesId : null,
                holders: formData.holders // Added holders to satisfy the NonNull requirement
            }
        });

        const competitionId = competitionResult?.createCompetition?.id;
        if (!competitionId) throw new Error("Failed to initialize competition root node.");

        // 2. Set planned timeline boundaries for the competition
        if (formData.plannedStartDate || formData.plannedEndDate) {
            const updateCompetitionDatesMutation = `
                mutation UpdateCompetitionDates($id: ID!, $input: UpdateCompetitionDatesInput!) {
                    updateCompetitionDates(id: $id, input: $input) { id }
                }
            `;
            await executeGraphQL(updateCompetitionDatesMutation, {
                id: competitionId,
                input: {
                    start: formData.plannedStartDate ? new Date(formData.plannedStartDate).toISOString() : null,
                    end: formData.plannedEndDate ? new Date(formData.plannedEndDate).toISOString() : null
                }
            });
        }

        // 3. Sequentially process and build each Commission node
        for (const commission of formData.commissions) {
            const createCommissionMutation = `
                mutation CreateCommission($input: CreateCommissionInput!) {
                    createCommission(input: $input) { id }
                }
            `;
            const commissionResult = await executeGraphQL(createCommissionMutation, {
                input: {
                    competitionId: competitionId,
                    name: commission.name
                }
            });

            const commissionId = commissionResult?.createCommission?.id;
            if (!commissionId) continue;

            // 4. Update the schedule and timeline constraints for the commission
            if (commission.plannedStartDate || commission.plannedEndDate) {
                const updateCommissionDatesMutation = `
                    mutation UpdateCommissionDates($id: ID!, $input: UpdateCommissionDatesInput!) {
                        updateCommissionDates(id: $id, input: $input) { id }
                    }
                `;
                await executeGraphQL(updateCommissionDatesMutation, {
                    id: commissionId,
                    input: {
                        start: commission.plannedStartDate ? new Date(commission.plannedStartDate).toISOString() : null,
                        end: commission.plannedEndDate ? new Date(commission.plannedEndDate).toISOString() : null
                    }
                });
            }

            // 5. Configure dynamic functional toggle configurations
            const setWineJumper = `mutation SetWJ($id: ID!, $v: Boolean!) { setCommissionWineJumperMiniGameEnabled(id: $id, enabled: $v) { id } }`;
            const setVoice = `mutation SetVoice($id: ID!, $v: Boolean!) { setCommissionVoiceCommentsEnabled(id: $id, enabled: $v) { id } }`;
            const setProp = `mutation SetProp($id: ID!, $v: Boolean!) { setCommissionPropertyCommentsEnabled(id: $id, enabled: $v) { id } }`;
            const setOrigin = `mutation SetOrigin($id: ID!, $v: Boolean!) { setCommissionBeverageOriginDuringEvaluationEnabled(id: $id, enabled: $v) { id } }`;

            await Promise.all([
                executeGraphQL(setWineJumper, { id: commissionId, v: commission.wineJumperMiniGameEnabled }),
                executeGraphQL(setVoice, { id: commissionId, v: commission.voiceCommentsEnabled }),
                executeGraphQL(setProp, { id: commissionId, v: commission.propertyCommentsEnabled }),
                executeGraphQL(setOrigin, { id: commissionId, v: commission.beverageOriginDuringEvaluationEnabled })
            ]);

            // 6. Map and bind multiple Replicas under the configured Commission
            for (const replica of commission.replicas) {
                const createReplicaMutation = `
                    mutation CreateCommissionReplica($input: CreateCommissionReplicaInput!) {
                        createCommissionReplica(input: $input) { id }
                    }
                `;
                await executeGraphQL(createReplicaMutation, {
                    input: {
                        commissionId: commissionId,
                        name: replica.name,
                        type: replica.type
                    }
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Execution Error:", error);
        return { success: false, error: error.message || "Internal Server Error" };
    }
}