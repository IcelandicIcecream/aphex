// Instance-level adapter interface for global settings and configuration
import type { InstanceSettings } from '../../types/instance';

export type { InstanceSettings };

export interface InstanceAdapter {
	getInstanceSettings(): Promise<InstanceSettings>;
	updateInstanceSettings(settings: Partial<InstanceSettings>): Promise<InstanceSettings>;
}
