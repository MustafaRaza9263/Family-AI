'use client';

import type { AttachmentItem } from '../attachments/types';
import { continueFromLastFrame } from '../continue-from-video';
import type { VersionGroup } from '../version-groups';
import { GenerationCard } from './generation-card';
import { VideoGenerationCard } from './video-generation-card';

export type DaySection = {
  key: string;
  label: string;
  groupIndexes: number[];
};

type ThreadCardsProps = {
  toolId: 'image' | 'video';
  groups: VersionGroup[];
  daySections: DaySection[];
  maxAttach: number;
  extraRefs: AttachmentItem[];
  onCancel: (jobId: string) => void;
  onRegenerate: (group: VersionGroup) => void;
  onContinueFrame: (item: AttachmentItem) => void;
  onEditPrompt: (prompt: string) => void;
  onEdit: (assetId: string) => void;
  onAddReference: (assetId: string) => void;
  onAnimate: (assetId: string) => void;
  onDelete: (assetId: string) => void;
  extractFrame: (assetId: string, at: 'first' | 'last') => Promise<{
    asset: { id: string };
  }>;
  onError: (err: unknown) => void;
  onContinueToast: () => void;
};

export function ThreadCards({
  toolId,
  groups,
  daySections,
  maxAttach,
  extraRefs,
  onCancel,
  onRegenerate,
  onContinueFrame,
  onEditPrompt,
  onEdit,
  onAddReference,
  onAnimate,
  onDelete,
  extractFrame,
  onError,
  onContinueToast,
}: ThreadCardsProps) {
  return (
    <>
      {daySections.map((section) => (
        <section key={section.key} className="flex w-full flex-col gap-6">
          <p className="text-center text-xs text-muted-foreground">
            {section.label}
          </p>
          {section.groupIndexes.map((gi) => {
            const group = groups[gi]!;
            const root = group.versions[0]!;
            if (toolId === 'video') {
              return (
                <VideoGenerationCard
                  key={group.rootId}
                  versions={group.versions}
                  onCancel={onCancel}
                  onRegenerate={() => onRegenerate(group)}
                  onContinue={(assetId) => {
                    void continueFromLastFrame(assetId, extractFrame)
                      .then((att) => {
                        onContinueFrame(att);
                        onContinueToast();
                      })
                      .catch(onError);
                  }}
                  onEditPrompt={() => onEditPrompt(root.job.prompt)}
                  onDelete={onDelete}
                />
              );
            }
            return (
              <GenerationCard
                key={group.rootId}
                versions={group.versions}
                canAddReference={extraRefs.length + 1 < maxAttach}
                onCancel={onCancel}
                onRegenerate={() => onRegenerate(group)}
                onEdit={onEdit}
                onEditPrompt={() => onEditPrompt(root.job.prompt)}
                onAddReference={onAddReference}
                onAnimate={onAnimate}
                onDelete={onDelete}
              />
            );
          })}
        </section>
      ))}
    </>
  );
}
