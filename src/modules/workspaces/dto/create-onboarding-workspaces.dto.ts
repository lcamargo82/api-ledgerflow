import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ONBOARDING_WORKSPACE_CHOICES = ['PERSONAL', 'BUSINESS', 'BOTH'] as const;

export type OnboardingWorkspaceChoice = (typeof ONBOARDING_WORKSPACE_CHOICES)[number];

export class CreateOnboardingWorkspacesDto {
  @ApiProperty({ enum: ONBOARDING_WORKSPACE_CHOICES, example: 'BOTH' })
  @IsIn(ONBOARDING_WORKSPACE_CHOICES)
  choice!: OnboardingWorkspaceChoice;
}
