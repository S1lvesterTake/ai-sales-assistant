import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import { ChatSessionsRepository } from '../chat/chat-sessions.repository';
import { DashboardRepository } from './dashboard.repository';

const DEFAULT_WIDGET_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly ownership: BusinessOwnershipService,
    private readonly chatRepo: ChatSessionsRepository,
  ) {}

  async getSummary(userId: string) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const summary = await this.repository.getSummary(owner.businessProfileId);
    return summary;
  }

  async getRecentLeads(userId: string, limit?: number) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const items = await this.repository.getRecentLeads(
      owner.businessProfileId,
      limit ?? DEFAULT_WIDGET_LIMIT,
    );

    return {
      success: true as const,
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async getRecentConversations(userId: string, limit?: number) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const items = await this.repository.getRecentConversations(
      owner.businessProfileId,
      limit ?? DEFAULT_WIDGET_LIMIT,
    );

    return {
      success: true as const,
      data: items.map((item) => ({
        sessionId: item.sessionId,
        customerName: item.customerName,
        lastMessage: item.lastMessage,
        lastMessageAt: item.lastMessageAt.toISOString(),
      })),
    };
  }

  async getTopQuestions(userId: string, limit?: number) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const items = await this.repository.getTopQuestions(
      owner.businessProfileId,
      limit ?? DEFAULT_WIDGET_LIMIT,
    );

    return {
      success: true as const,
      data: items,
    };
  }

  async getConversationMessages(
    userId: string,
    sessionId: string,
    page?: number,
    limit?: number,
  ) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const session = await this.chatRepo.findByIdAndBusiness(
      sessionId,
      owner.businessProfileId,
    );
    if (!session) {
      throw new NotFoundException({
        message: 'Percakapan tidak ditemukan',
        code: 'CONVERSATION_NOT_FOUND',
      });
    }

    const result = await this.chatRepo.findMessagesBySession(
      sessionId,
      owner.businessProfileId,
      page,
      limit,
    );

    return {
      success: true as const,
      data: result.items.map((msg) => ({
        id: msg.id,
        role: msg.role,
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
        clientMessageId: msg.clientMessageId,
        replyToMessageId: msg.replyToMessageId,
        processingStatus: msg.processingStatus,
      })),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  private profileNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Profil bisnis belum dibuat',
      code: 'BUSINESS_PROFILE_NOT_FOUND',
    });
  }
}
