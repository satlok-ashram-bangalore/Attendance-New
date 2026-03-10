'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2, Award, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Platform {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
  level: number;
  platform_id: number;
  platforms?: Platform;
}

interface SkillWithPlatform extends Skill {
  platforms: Platform;
}

interface GroupedSkills {
  [platformId: number]: {
    platform: Platform;
    skills: SkillWithPlatform[];
  };
}

interface MemberSkillsDialogProps {
  memberId: number;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberSkillsDialog({
  memberId,
  memberName,
  open,
  onOpenChange,
}: MemberSkillsDialogProps) {
  const [allSkills, setAllSkills] = useState<SkillWithPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsedPlatforms, setCollapsedPlatforms] = useState<Set<number>>(new Set());
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set());
  const [originalSkillIds, setOriginalSkillIds] = useState<Set<number>>(new Set());

  const notification = useNotification();

  const fetchData = useCallback(async () => {
    if (!open || !memberId) return;

    setLoading(true);
    try {
      const [memberSkillsRes, allSkillsRes] = await Promise.all([
        supabase
          .from('member_skills')
          .select('skill_id')
          .eq('member_id', memberId),
        supabase
          .from('skills')
          .select('*, platforms!inner(id, name)')
          .order('created_at', { ascending: false }),
      ]);

      if (memberSkillsRes.error) throw memberSkillsRes.error;
      if (allSkillsRes.error) throw allSkillsRes.error;

      setAllSkills((allSkillsRes.data || []) as SkillWithPlatform[]);

      // Collapse all platforms by default
      const platformIds = new Set(
        (allSkillsRes.data || [])
          .map((s: SkillWithPlatform) => s.platform_id)
      );
      setCollapsedPlatforms(platformIds);

      const skillIds = new Set((memberSkillsRes.data || []).map(ms => ms.skill_id));
      setSelectedSkillIds(skillIds);
      setOriginalSkillIds(skillIds);
    } catch (error) {
      notification.error('Failed to load skills data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [open, memberId]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Group skills by platform
  const groupedSkills: GroupedSkills = allSkills.reduce((acc, skill) => {
    if (!skill.platforms) return acc;

    const platformId = skill.platform_id;
    if (!acc[platformId]) {
      acc[platformId] = {
        platform: skill.platforms,
        skills: [],
      };
    }
    acc[platformId].skills.push(skill);
    return acc;
  }, {} as GroupedSkills);

  // Sort skills within each platform by level ascending
  for (const group of Object.values(groupedSkills)) {
    group.skills.sort((a:Skill, b:Skill) => a.level - b.level);
  }

  const togglePlatform = (platformId: number) => {
    setCollapsedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platformId)) {
        next.delete(platformId);
      } else {
        next.add(platformId);
      }
      return next;
    });
  };

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const toInsert = Array.from(selectedSkillIds).filter(id => !originalSkillIds.has(id));
  const toDelete = Array.from(originalSkillIds).filter(id => !selectedSkillIds.has(id));
  const hasChanges = toInsert.length > 0 || toDelete.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      // Delete removed skills
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('member_skills')
          .delete()
          .eq('member_id', memberId)
          .in('skill_id', toDelete);

        if (deleteError) throw deleteError;
      }

      // Insert new skills
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('member_skills')
          .insert(toInsert.map(skillId => ({
            member_id: memberId,
            skill_id: skillId,
          })));

        if (insertError) throw insertError;
      }

      notification.success(
        `Skills updated: ${toInsert.length} added, ${toDelete.length} removed`
      );
      onOpenChange(false);
    } catch (error) {
      notification.error('Failed to save skills');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_1fr_auto]! sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Manage Skills
          </DialogTitle>
          <DialogDescription>
            {memberName}
            {hasChanges && (
              <Badge variant="outline" className="ml-2 text-xs">
                {toInsert.length + toDelete.length} pending
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="overflow-y-auto space-y-2 pr-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedSkills).length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No skills available. Admin needs to create skills first.
            </div>
          ) : (
            Object.entries(groupedSkills).map(([platformId, { platform, skills }]) => {
              const isCollapsed = collapsedPlatforms.has(Number(platformId));
              const platformSelected = skills.filter((s: SkillWithPlatform) => selectedSkillIds.has(s.id)).length;

              return (
                <div
                  key={platformId}
                  className="border border-border rounded-lg overflow-hidden bg-card"
                >
                  {/* Platform Header */}
                  <button
                    type="button"
                    onClick={() => togglePlatform(Number(platformId))}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-sm">{platform.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {platformSelected}/{skills.length}
                      </Badge>
                    </div>
                  </button>

                  {/* Skills List */}
                  {!isCollapsed && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {skills.map((skill: SkillWithPlatform) => {
                        const isChecked = selectedSkillIds.has(skill.id);

                        return (
                          <div
                            key={skill.id}
                            className="flex items-center gap-3 p-2 rounded border border-border cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleSkill(skill.id)}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleSkill(skill.id)}
                              className="pointer-events-none"
                            />
                            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                              <span className="font-medium text-sm">{skill.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Lv.{skill.level}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with save */}
        <DialogFooter>
          <div className="flex items-center justify-between w-full gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedSkillIds.size} skill{selectedSkillIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
