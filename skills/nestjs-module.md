# Skill: Create NestJS Module

## Trigger
Use this skill when asked to create a new NestJS feature module in this project.

**Trigger phrases:** "buat module baru", "tambahkan module [X]", "create [X] module", "scaffold [X] feature"

---

## Pre-Implementation Checklist

Before writing any code, Claude must:

1. **Read `docs/AGENTS.md`** — confirm you know the current architectural constraints
2. **Read `docs/CLAUDE.md`** — identify where this module fits in the module catalog
3. **Find the nearest existing module** as a pattern reference. For CRUD modules: read `backend/src/modules/products/` in full. For auth-adjacent: read `backend/src/modules/auth/`.
4. **Check `backend/src/database/schema/index.ts`** — identify which tables this module will interact with
5. **Confirm** which existing services/repositories this module will depend on (if any)

---

## Module File Structure

Every new module `{feature}` lives at `backend/src/modules/{feature}/` and contains:

```
modules/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── {feature}.repository.ts          # Only if this module owns DB access
├── dto/
│   ├── create-{feature}.dto.ts
│   ├── update-{feature}.dto.ts       # Only if update endpoint exists
│   ├── {feature}-response.dto.ts
│   └── {feature}-query.dto.ts        # Only if list/filter endpoint exists
└── {feature}.service.spec.ts         # Unit tests — always create alongside service
```

---

## Implementation Rules (from AGENTS.md)

### Controller
```typescript
@ApiTags('Feature Name')
@Controller('api/features')
@UseGuards(JwtAuthGuard)          // ALWAYS at class level for private controllers
export class FeatureController {

  @Get()
  @ResponseMessage('Features retrieved successfully')
  @ApiOkResponse({ type: FeatureResponseDto })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.featureService.findAll(user.businessProfileId);
  }
}
```

**Never:** `@UseGuards()` on individual methods. **Always:** on the class.

### Service
```typescript
@Injectable()
export class FeatureService {
  constructor(private readonly featureRepository: FeatureRepository) {}

  async findAll(businessProfileId: string): Promise<FeatureResponseDto[]> {
    return this.featureRepository.findAllByBusinessProfile(businessProfileId);
  }
}
```

**Never:** import `DatabaseService` in a service. **Always:** delegate to repository.

### Repository
```typescript
@Injectable()
export class FeatureRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAllByBusinessProfile(businessProfileId: string) {
    return this.database.db
      .select()
      .from(schema.features)
      .where(eq(schema.features.businessProfileId, businessProfileId))
      .orderBy(desc(schema.features.createdAt));
  }
}
```

**Always:** scope reads/writes by `businessProfileId`. Import schema from `schema/index.ts`, never individual files.

### DTOs
```typescript
export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature name', example: 'My Feature' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

export class FeatureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;
  
  // NEVER include: businessProfileId, userId, is_demo, access_token_hash
}
```

---

## Security Checklist for Every Module

Before outputting the final code, verify:

- [ ] `businessProfileId` derived from `@CurrentUser()`, never from DTO
- [ ] `@UseGuards(JwtAuthGuard)` on controller class
- [ ] No internal IDs (`userId`, `businessProfileId`) in response DTOs
- [ ] All inputs typed as DTOs with class-validator decorators
- [ ] No `process.env.X` direct access — use `ConfigService.getOrThrow()`
- [ ] No raw SQL — all queries via Drizzle ORM methods

---

## Module Registration

Register in `backend/src/app.module.ts`:
```typescript
imports: [
  // ... existing modules
  FeatureModule,
],
```

---

## Unit Test Template

Create `{feature}.service.spec.ts` alongside the service:

```typescript
describe('FeatureService', () => {
  let service: FeatureService;
  let repository: jest.Mocked<FeatureRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: FeatureRepository,
          useValue: {
            findAllByBusinessProfile: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(FeatureService);
    repository = module.get(FeatureRepository);
  });

  describe('findAll', () => {
    it('should return items scoped to businessProfileId', async () => {
      const profileId = 'profile-123';
      const mockItems = [{ id: '1', name: 'Test', businessProfileId: profileId }];
      repository.findAllByBusinessProfile.mockResolvedValue(mockItems);

      const result = await service.findAll(profileId);

      expect(repository.findAllByBusinessProfile).toHaveBeenCalledWith(profileId);
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no items exist', async () => {
      repository.findAllByBusinessProfile.mockResolvedValue([]);
      const result = await service.findAll('profile-123');
      expect(result).toEqual([]);
    });
  });

  // Add: error cases, ownership enforcement, edge cases per behavior
});
```

---

## Output Sequence

Generate files in this exact order:
1. Schema changes (if any) — add to `schema/index.ts`, then run `npm run db:generate`
2. Repository
3. DTOs
4. Service + spec file
5. Controller
6. Module file
7. App module registration

Do not skip the spec file. Do not generate all files in one block without this ordering.