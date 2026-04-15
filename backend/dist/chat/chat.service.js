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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const chat_message_entity_1 = require("./chat-message.entity");
const agents_service_1 = require("../agents/agents.service");
let ChatService = class ChatService {
    constructor(msgRepo, agentsService) {
        this.msgRepo = msgRepo;
        this.agentsService = agentsService;
    }
    async sendMessage(agentId, workspaceId, message) {
        const agent = await this.agentsService.findOne(agentId, workspaceId);
        if (agent.status !== 'running' || !agent.gatewayPort) {
            throw new common_1.BadRequestException('Agent is not running');
        }
        // TODO: Confirm exact OpenClaw HTTP gateway endpoint + body shape (Open Question #2)
        const { data } = await axios_1.default.post(`http://127.0.0.1:${agent.gatewayPort}/message`, { content: message });
        await this.msgRepo.save([
            this.msgRepo.create({ agent, role: 'user', content: message }),
            this.msgRepo.create({ agent, role: 'assistant', content: data.reply }),
        ]);
        return data.reply;
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
        agents_service_1.AgentsService])
], ChatService);
//# sourceMappingURL=chat.service.js.map