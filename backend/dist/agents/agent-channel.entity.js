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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentChannel = void 0;
const typeorm_1 = require("typeorm");
const agent_entity_1 = require("./agent.entity");
let AgentChannel = class AgentChannel {
};
exports.AgentChannel = AgentChannel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AgentChannel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, (agent) => agent.channels, { onDelete: 'CASCADE' }),
    __metadata("design:type", agent_entity_1.Agent)
], AgentChannel.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AgentChannel.prototype, "channelType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], AgentChannel.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], AgentChannel.prototype, "enabled", void 0);
exports.AgentChannel = AgentChannel = __decorate([
    (0, typeorm_1.Entity)('agent_channels')
], AgentChannel);
//# sourceMappingURL=agent-channel.entity.js.map