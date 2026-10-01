import { ChatGroq } from "@langchain/groq"
import { ChatOpenRouter } from "@langchain/openrouter"
import { TavilySearch } from "@langchain/tavily"
import "dotenv/config"
import express from "express"
import { createAgent, modelFallbackMiddleware } from "langchain"

const porta = 3001
const app = express()

app.use(express.json())

const modeloGroq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.API_GROQ,
    temperature: 0.7
})

const modelosOpenrouter = new ChatOpenRouter({
    model: process.env.MODELO_OPENROUTER_1,
    apiKey: process.env.API_OPENROUTER,
    temperature: 0.7,
    models:[
        process.env.MODELO_OPENROUTER_2,
        process.env.MODELO_OPENROUTER_3,
        process.env.MODELO_OPENROUTER_4
    ],
    route: "fallback"
})

const toolTavily = new TavilySearch({
    tavilyApiKey: process.env.API_TAVILY
})

const agentAtualizado = createAgent({
    model: modelosOpenrouter,
    systemPrompt: "Voce é um agent jornalistico responsavel por fornecer informacoes atualizadas, utilize a tool toolTavily para pegar informacoes atualizadas!",
    tools: [
        toolTavily
    ],
    middleware: [
        modelFallbackMiddleware(modeloGroq)
    ]
})

const historico = []

app.post("/conversa" , async (req , res) => {
    try {
        const {pergunta} = req.body

        historico.push({role: "user" , content: pergunta})

        if(!pergunta){
            return res.status(400).json({Resposta: "Todos os dados devem estar preenchido!"})
        }

        const resposta = await agentAtualizado.invoke({
            messages: [
                ...historico,
                {
                    role: "user" , content: pergunta
                }
            ]
        })

        historico.push({role: "assistant" , content: resposta.messages.at(-1).content})

        return res.status(200).json({Resposta : resposta.messages.at(-1).content})
    } catch (error) {
        console.log(error)
    }
})

app.listen(porta , () => {
    console.log("htpp://localhost:" + porta)
})