"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const agent_entity_1 = require("./agent.entity");
let AgentsService = class AgentsService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(workspaceId) {
        return this.repo.find({
            where: { workspace: { id: workspaceId } },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id, workspaceId) {
        const agent = await this.repo.findOne({
            where: { id, workspace: { id: workspaceId } },
        });
        if (!agent)
            throw new common_1.NotFoundException('Agent not found');
        return agent;
    }
    async create(dto, workspace) {
        const agent = this.repo.create({ ...dto, workspace, channels: [] });
        return this.repo.save(agent);
    }
    async update(id, workspaceId, dto) {
        const agent = await this.findOne(id, workspaceId);
        Object.assign(agent, dto);
        return this.repo.save(agent);
    }
    async remove(id, workspaceId) {
        const agent = await this.findOne(id, workspaceId);
        await this.repo.remove(agent);
    }
    /** Write DB config fields to the agent's disk workspace. Called before spawn. */
    async writeConfigFiles(agent, workspace) {
        const dir = path.join(workspace.diskPath, 'agents', agent.id);
        await fs.mkdir(dir, { recursive: true });
        await Promise.all([
            fs.writeFile(path.join(dir, 'SOUL.md'), agent.soulMd),
            fs.writeFile(path.join(dir, 'TOOLS.md'), agent.toolsMd),
            fs.writeFile(path.join(dir, 'IDENTITY.md'), agent.identityMd),
            fs.writeFile(path.join(dir, 'HEARTBEAT.md'), agent.heartbeatMd),
        ]);
    }
    /** Read MEMORY.md directly from disk (never cached in DB). */
    async getMemory(agent, workspace) {
        const file = path.join(workspace.diskPath, 'agents', agent.id, 'MEMORY.md');
        try {
            return await fs.readFile(file, 'utf8');
        }
        catch {
            return '';
        }
    }
    /** Write MEMORY.md directly to disk. */
    async setMemory(agent, workspace, content) {
        const dir = path.join(workspace.diskPath, 'agents', agent.id);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, 'MEMORY.md'), content);
    }
    async updateStatus(id, status, gatewayPort = null) {
        await this.repo.update(id, { status, gatewayPort });
    }
    /** Guard: throw if agent does not belong to workspace (IDOR prevention). */
    async assertOwnership(id, workspaceId) {
        const agent = await this.repo.findOne({
            where: { id },
            relations: ['workspace'],
        });
        if (!agent)
            throw new common_1.NotFoundException('Agent not found');
        if (agent.workspace.id !== workspaceId)
            throw new common_1.ForbiddenException();
        return agent;
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AgentsService);
//# sourceMappingURL=agents.service.js.map