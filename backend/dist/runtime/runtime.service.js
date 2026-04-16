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
var RuntimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeService = void 0;
const common_1 = require("@nestjs/common");
const agents_service_1 = require("../agents/agents.service");
/**
 * RuntimeService manages agent lifecycle.
 *
 * In the current architecture, agents are not separate processes — LLM calls
 * happen inline in ChatService. Start/stop simply toggle agent status so the
 * UI can reflect whether an agent is "active" or "paused".
 */
let RuntimeService = RuntimeService_1 = class RuntimeService {
    constructor(agentsService) {
        this.agentsService = agentsService;
        this.logger = new common_1.Logger(RuntimeService_1.name);
    }
    async start(agentId, workspaceId) {
        await this.agentsService.assertOwnership(agentId, workspaceId);
        await this.agentsService.updateStatus(agentId, 'running', null);
        this.logger.log(`Agent ${agentId} started`);
    }
    async stop(agentId, workspaceId) {
        try {
            await this.agentsService.assertOwnership(agentId, workspaceId);
        }
        catch {
            return;
        }
        await this.agentsService.updateStatus(agentId, 'stopped', null);
        this.logger.log(`Agent ${agentId} stopped`);
    }
    async restart(agentId, workspaceId) {
        await this.stop(agentId, workspaceId);
        await this.start(agentId, workspaceId);
    }
};
exports.RuntimeService = RuntimeService;
exports.RuntimeService = RuntimeService = RuntimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agents_service_1.AgentsService])
], RuntimeService);
//# sourceMappingURL=runtime.service.js.map