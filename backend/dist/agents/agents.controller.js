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
exports.AgentsController = void 0;
const common_1 = require("@nestjs/common");
const agents_service_1 = require("./agents.service");
const workspaces_service_1 = require("../workspaces/workspaces.service");
const runtime_service_1 = require("../runtime/runtime.service");
const create_agent_dto_1 = require("./dto/create-agent.dto");
const update_agent_dto_1 = require("./dto/update-agent.dto");
let AgentsController = class AgentsController {
    constructor(agentsService, workspacesService, runtimeService) {
        this.agentsService = agentsService;
        this.workspacesService = workspacesService;
        this.runtimeService = runtimeService;
    }
    findAll(req) {
        const { workspaceId } = req.user;
        return this.agentsService.findAll(workspaceId);
    }
    async create(dto, req) {
        const { workspaceId } = req.user;
        const workspace = await this.workspacesService.findById(workspaceId);
        return this.agentsService.create(dto, workspace);
    }
    findOne(id, req) {
        const { workspaceId } = req.user;
        return this.agentsService.findOne(id, workspaceId);
    }
    update(id, dto, req) {
        const { workspaceId } = req.user;
        return this.agentsService.update(id, workspaceId, dto);
    }
    async remove(id, req) {
        const { workspaceId } = req.user;
        await this.runtimeService.stop(id, workspaceId);
        await this.agentsService.remove(id, workspaceId);
    }
    start(id, req) {
        const { workspaceId } = req.user;
        return this.runtimeService.start(id, workspaceId);
    }
    stop(id, req) {
        const { workspaceId } = req.user;
        return this.runtimeService.stop(id, workspaceId);
    }
    restart(id, req) {
        const { workspaceId } = req.user;
        return this.runtimeService.restart(id, workspaceId);
    }
    async status(id, req) {
        const { workspaceId } = req.user;
        const agent = await this.agentsService.findOne(id, workspaceId);
        return { status: agent.status, gatewayPort: agent.gatewayPort };
    }
    async getMemory(id, req) {
        const { workspaceId } = req.user;
        const agent = await this.agentsService.findOne(id, workspaceId);
        const workspace = await this.workspacesService.findById(workspaceId);
        const content = await this.agentsService.getMemory(agent, workspace);
        return { content };
    }
    async setMemory(id, content, req) {
        const { workspaceId } = req.user;
        const agent = await this.agentsService.findOne(id, workspaceId);
        const workspace = await this.workspacesService.findById(workspaceId);
        await this.agentsService.setMemory(agent, workspace, content);
    }
};
exports.AgentsController = AgentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_agent_dto_1.CreateAgentDto, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_agent_dto_1.UpdateAgentDto, Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/stop'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "stop", null);
__decorate([
    (0, common_1.Post)(':id/restart'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "restart", null);
__decorate([
    (0, common_1.Get)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "status", null);
__decorate([
    (0, common_1.Get)(':id/memory'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getMemory", null);
__decorate([
    (0, common_1.Patch)(':id/memory'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('content')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "setMemory", null);
exports.AgentsController = AgentsController = __decorate([
    (0, common_1.Controller)('agents'),
    __metadata("design:paramtypes", [agents_service_1.AgentsService,
        workspaces_service_1.WorkspacesService,
        runtime_service_1.RuntimeService])
], AgentsController);
//# sourceMappingURL=agents.controller.js.map