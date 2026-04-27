/**
 * Centralized field help for the wizard, so discovery / manual-entry copy stays consistent
 * and does not repeat the same paragraph on every Combobox.
 */

export function vpcFieldHelp(isAws: boolean, hasProfile: boolean, region: string): string {
  if (isAws && hasProfile) {
    return `Suggested networks in ${region.trim() || "this region"} (read-only). Choose a VPC to filter subnets and security groups, or type any id.`;
  }
  if (isAws) {
    return "Select a credential profile to load suggestions, or type a VPC id manually.";
  }
  return "Paste a network or parent resource name or id (see the discovery note above when shown).";
}

export function subnetFieldHelp(isAws: boolean): string {
  if (isAws) {
    return "Required. With a parent network and profile, we list AWS subnets; you can still paste any subnet id.";
  }
  return "Required. Subnetwork, host line, or port id for your project.";
}
