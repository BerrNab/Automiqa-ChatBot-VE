import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

export interface RerankedChunk {
    text: string;
    similarity: number;
    filename: string;
    metadata: any;
    rerankScore: number;
}

/**
 * Rerank Service
 * 
 * Uses an LLM as a cross-encoder to rerank retrieved document chunks.
 * This significantly improves precision by filtering out irrelevant context.
 */
export class RerankService {
    private model: ChatOpenAI;

    constructor() {
        this.model = new ChatOpenAI({
            modelName: "gpt-4o",
            temperature: 0,
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Rerank a list of chunks based on a query
     */
    async rerankChunks(
        query: string,
        chunks: any[],
        topK = 5
    ): Promise<RerankedChunk[]> {
        if (chunks.length === 0) return [];
        if (chunks.length === 1) {
            return chunks.map(c => ({ ...c, rerankScore: 1 }));
        }

        try {
            console.log(`[RerankService] Reranking ${chunks.length} chunks for query: "${query}"`);

            // Define internal schema for reranking
            const parser = StructuredOutputParser.fromZodSchema(
                z.object({
                    rankedIndices: z.array(
                        z.object({
                            index: z.number().describe("The 0-based index of the chunk"),
                            score: z.number().describe("Relevance score from 0 to 10"),
                            reason: z.string().describe("Brief reason for the score"),
                        })
                    ).describe("List of ranked chunks by relevance"),
                })
            );

            const prompt = new PromptTemplate({
                template: `You are an expert information retrieval system. 
Your task is to rerank a list of document chunks based on their relevance to a user query.

USER QUERY: {query}

DOCUMENT CHUNKS:
{chunks_formatted}

INSTRUCTIONS:
1. Carefully analyze each chunk and determine how well it answers or provides context for the user query.
2. Assign a relevance score from 0 to 10 (10 being perfectly relevant).
3. Return the indices and scores in order of relevance.
4. Be strict: if a chunk is not relevant, give it a low score.

{format_instructions}`,
                inputVariables: ["query", "chunks_formatted"],
                partialVariables: { format_instructions: parser.getFormatInstructions() },
            });

            // Format chunks for the prompt
            const chunksFormatted = chunks.map((c, i) => `[Chunk ${i}]:\n${c.text}`).join("\n\n---\n\n");

            const input = await prompt.format({
                query,
                chunks_formatted: chunksFormatted,
            });

            const response = await this.model.invoke(input);
            const output = await parser.parse(response.content.toString());

            // Map back to original chunks with scores
            const reranked = output.rankedIndices
                .map(item => {
                    const chunk = chunks[item.index];
                    if (!chunk) return null;
                    return {
                        ...chunk,
                        rerankScore: item.score / 10,
                    };
                })
                .filter((c): c is RerankedChunk => c !== null)
                // Filter out low relevance scores (e.g., < 3/10)
                .filter(c => c.rerankScore >= 0.3)
                .sort((a, b) => b.rerankScore - a.rerankScore)
                .slice(0, topK);

            console.log(`[RerankService] Reranking complete. Selected top ${reranked.length} chunks.`);
            return reranked;
        } catch (error) {
            console.error("[RerankService] Error during reranking:", error);
            // Fallback to original order if reranking fails
            return chunks.slice(0, topK).map(c => ({ ...c, rerankScore: 0.5 }));
        }
    }
}

export const rerankService = new RerankService();
