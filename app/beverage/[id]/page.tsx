export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL, fetchGraphQLRaw } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding"
import { getUsernamesAction } from "@/app/userActions"
import { GET_BEVERAGE, GET_BEVERAGE_AWARDS, GET_COMMISSION_FOR_AWARD } from "./queries"
import BeverageClientView from "./BeverageClientView"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function BeveragePage({ params }: PageProps) {
    const resolvedParams = await params
    const beverageId = resolvedParams.id

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value

    if (!auidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(auidStr, 10)

    let beverage: any = null
    let awards: any[] = []
    let awardsWithCompetitionInfo: any[] = []

    try {
        const beverageData = await fetchGraphQL(GET_BEVERAGE as any, { id: beverageId }) as any;
        beverage = beverageData?.beverage;

        if (!beverage) {
            return <BeverageClientView isNotFound={true} initialData={null} currentAuid={currentAuid} />
        }

        try {
            const auidsToFetch: number[] = [];
            if (beverage.createdBy) {
                const cId = Array.isArray(beverage.createdBy) ? beverage.createdBy[0] : beverage.createdBy;
                if (cId) auidsToFetch.push(Number(cId));
            }
            if (beverage.producers && beverage.producers.length > 0) {
                beverage.producers.forEach((p: any) => {
                    if (p.auid) {
                        const a = Array.isArray(p.auid) ? p.auid[0] : p.auid;
                        if (a) auidsToFetch.push(Number(a));
                    }
                });
            }
            const uniqueAuids = Array.from(new Set(auidsToFetch));
            const usernamesMap = uniqueAuids.length > 0
                ? (await getUsernamesAction(uniqueAuids) as Record<string, any>)
                : {};

            if (beverage.producers && beverage.producers.length > 0) {
                beverage.producers = beverage.producers.map((p: any) => {
                    const auidKey = p.auid ? String(Array.isArray(p.auid) ? p.auid[0] : p.auid) : null;
                    const userInfo = auidKey ? usernamesMap[auidKey] : null;

                    let dName = null;
                    let uName = null;

                    if (typeof userInfo === 'string') {
                        dName = userInfo;
                        uName = userInfo;
                    } else if (userInfo && typeof userInfo === 'object') {
                        dName = userInfo.displayName || null;
                        uName = userInfo.username || null;
                    }

                    return {
                        ...p,
                        displayName: dName,
                        username: uName
                    };
                });
            }

            if (beverage.createdBy) {
                const cId = String(Array.isArray(beverage.createdBy) ? beverage.createdBy[0] : beverage.createdBy);
                const cInfo = usernamesMap[cId];
                let createdByName = null;
                let createdByUsername = null;
                if (typeof cInfo === 'string') {
                    createdByName = cInfo;
                    createdByUsername = cInfo;
                } else if (cInfo && typeof cInfo === 'object') {
                    createdByName = cInfo.displayName || null;
                    createdByUsername = cInfo.username || null;
                }
                beverage.createdByUser = {
                    auid: cId,
                    displayName: createdByName,
                    username: createdByUsername
                };
            }
        } catch (err) {
            console.error("Failed to fetch producer usernames:", err);
        }

        let originParts: string[] = []
        if (beverage.origin && typeof beverage.origin.latitude === "number" && typeof beverage.origin.longitude === "number") {
            const info = await getGeographicInfo(beverage.origin.latitude, beverage.origin.longitude)
            if (info) {
                originParts = [info.country, info.district].filter(Boolean) as string[]
            }
        }

        let colorVal: string | null = null
        if (beverage.attributes) {
            if (typeof beverage.attributes === "object" && beverage.attributes !== null) {
                colorVal = (beverage.attributes as any).color || null
            } else if (typeof beverage.attributes === "string") {
                try {
                    const parsed = JSON.parse(beverage.attributes)
                    if (parsed && parsed.color) {
                        colorVal = parsed.color
                    }
                } catch (e) {
                    const match = beverage.attributes.match(/color=([^,\}]+)/)
                    if (match) {
                        colorVal = match[1].trim().replace(/^["']|["']$/g, "")
                    }
                }
            }
        }

        try {
            const awardsData = await fetchGraphQL(GET_BEVERAGE_AWARDS as any, { id: beverageId }) as any;
            awards = awardsData?.beverageAwards || []

            awardsWithCompetitionInfo = await Promise.all(
                awards.map(async (award: any) => {
                    try {
                        const commissionData = await fetchGraphQL(GET_COMMISSION_FOR_AWARD as any, { id: award.commissionId }) as any;
                        return {
                            ...award,
                            commission: commissionData?.commission
                        }
                    } catch (error) {
                        console.error(`Failed to fetch commission ${award.commissionId}:`, error)
                        return { ...award, commission: null }
                    }
                })
            )
        } catch (error) {
            console.error("Failed to fetch beverage awards:", error)
        }

        let batches: any[] = []
        try {
            const batchesQuery = `
              query GetBeverageBatches($beverageId: ID!) {
                batches(beverageId: $beverageId) {
                  items {
                    id
                    volumeMl
                    lotNumber
                    attributes
                    createdAt
                  }
                }
              }
            `
            const batchesData = await fetchGraphQLRaw<any, any>(batchesQuery, { beverageId })
            const rawBatches = batchesData?.batches?.items || []

            batches = await Promise.all(
                rawBatches.map(async (batch: any) => {
                    try {
                        const samplesQuery = `
                          query GetBatchSamples($batchId: ID!) {
                            samples(batchId: $batchId) {
                              items {
                                id
                                volumeMl
                                attributes
                                createdAt
                              }
                            }
                          }
                        `;
                        const samplesData = await fetchGraphQLRaw<any, any>(samplesQuery, { batchId: batch.id });
                        return {
                            ...batch,
                            samples: samplesData?.samples?.items || [],
                        };
                    } catch (sampleErr) {
                        console.error(`Failed to fetch samples for batch ${batch.id}:`, sampleErr);
                        return {
                            ...batch,
                            samples: [],
                        };
                    }
                })
            );
        } catch (error) {
            console.error("Failed to fetch beverage batches:", error)
        }

        let beverageTypeName = ""
        try {
            const typeQuery = `
              query GetBeverageType($id: ID!) {
                beverageType(id: $id) {
                  name
                }
              }
            `
            const typeData = await fetchGraphQLRaw<any, any>(typeQuery, { id: beverage.typeId })
            beverageTypeName = typeData?.beverageType?.name || ""
        } catch (error) {
            console.error("Failed to fetch beverage type name:", error)
        }

        const initialData = {
            beverage: {
                ...beverage,
                type: colorVal || "WINE", // keep fallback to avoid TS issues
                colorType: colorVal,
                beverageTypeName,
                originParts
            },
            awards: awardsWithCompetitionInfo,
            batches
        }

        return <BeverageClientView initialData={initialData} currentAuid={currentAuid} />
    } catch (error) {
        console.error("Failed to fetch beverage:", error)
        return <BeverageClientView isError={true} initialData={null} currentAuid={currentAuid} />
    }
}