"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_message_entity_1 = require("./chat-message.entity");
const agents_service_1 = require("../agents/agents.service");
const api_keys_service_1 = require("../api-keys/api-keys.service");
const llm_service_1 = require("../llm/llm.service");
let ChatService = class ChatService {
    constructor(msgRepo, agentsService, apiKeysService, llmService) {
        this.msgRepo = msgRepo;
        this.agentsService = agentsService;
        this.apiKeysService = apiKeysService;
        this.llmService = llmService;
    }
    async sendMessage(agentId, workspaceId, message) {
        const agent = await this.agentsService.findOne(agentId, workspaceId);
        // Load recent history from DB (last 50 turns = 100 messages)
        const history = await this.msgRepo.find({
            where: { agent: { id: agentId } },
            order: { createdAt: 'ASC' },
            take: 100,
        });
        const messages = [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: message },
        ];
        // Get decrypted API keys for this workspace
        const apiKeys = await this.apiKeysService.buildEnvForAgent(workspaceId);
        // Call LLM
        const reply = await this.llmService.chat({
            provider: agent.modelProvider,
            model: agent.modelName,
            systemPrompt: agent.soulMd,
            messages,
            apiKeys,
        });
        // Persist both turns
        await this.msgRepo.save([
            this.msgRepo.create({ agent, role: 'user', content: message }),
            this.msgRepo.create({ agent, role: 'assistant', content: reply }),
        ]);
        return reply;
    }
    async getHistory(agentId, workspaceId, page = 1, limit = 50) {
        await this.agentsService.findOne(agentId, workspaceId); // ownership check
        return this.msgRepo.find({
            where: { agent: { id: agentId } },
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        agents_service_1.AgentsService,
        api_keys_service_1.ApiKeysService,
        llm_service_1.LlmService])
], ChatService);
//# sourceMappingURL=chat.service.js.map