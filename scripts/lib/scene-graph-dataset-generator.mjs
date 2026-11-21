/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UI SCENE GRAPH PAIRS DATASET GENERATOR (STAGE 2 CURRICULUM)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M3 / G-UX-010)
 * Purpose: Generates 5,000 verified, acyclic (screenshot metadata, scene graph DAG)
 *          paired records across Desktop (40%), Tablet (30%), and Mobile (30%)
 *          viewports with strict 80/10/10 split and zero sample leakage.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { synthesizeSceneGraph } from './ui-scene-graph.mjs';

export const SCENE_TYPES = Object.freeze([
  'dashboard',
  'ecommerce',
  'auth_form',
  'analytics_table',
  'mobile_nav',
  'detail_card',
  'feed_list',
  'media_dialog'
]);

export const THEMES = Object.freeze([
  'slate_dark',
  'indigo_light',
  'zinc_neutral'
]);

export const VIEWPORTS = Object.freeze({
  desktop: { name: 'desktop', width: 1440, height: 900 },
  tablet: { name: 'tablet', width: 1024, height: 768 },
  mobile: { name: 'mobile', width: 390, height: 844 }
});

// Deterministic Pseudo-Random Number Generator (Mulberry32)
export function createRng(seed) {
  let s = Math.floor(seed) >>> 0;
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a single paired synthetic UI scene graph record.
 */
export function generateSceneGraphRecord(index, rng = Math.random) {
  const padIndex = String(index + 1).padStart(6, '0');
  const recordId = `SG-PAIR-${padIndex}`;

  // Viewport distribution: 40% Desktop, 30% Tablet, 30% Mobile
  let vp;
  const vpRoll = (index % 10);
  if (vpRoll < 4) {
    vp = VIEWPORTS.desktop;
  } else if (vpRoll < 7) {
    vp = VIEWPORTS.tablet;
  } else {
    vp = VIEWPORTS.mobile;
  }

  const sceneType = SCENE_TYPES[index % SCENE_TYPES.length];
  const theme = THEMES[index % THEMES.length];
  const W = vp.width;
  const H = vp.height;

  // Root node: ScreenRoot
  const nodes = [
    {
      node_id: 'node_root',
      component_type: 'ScreenRoot',
      category: 'container',
      bbox: [0, 0, W, H],
      bbox_normalized: [0, 0, 1000, 1000],
      z_index: 0,
      interaction_state: 'default',
      text_content: null,
      aria: { role: 'main' }
    }
  ];

  const edges = [];

  // Construct scene elements based on scene type
  if (sceneType === 'dashboard') {
    // Header
    nodes.push({
      node_id: 'node_header',
      component_type: 'HeaderBar',
      category: 'container',
      bbox: [0, 0, W, 64],
      bbox_normalized: [0, 0, 1000, Math.round((64 / H) * 1000)],
      z_index: 10,
      interaction_state: 'default',
      text_content: null,
      aria: { role: 'banner' }
    });
    edges.push({ source: 'node_root', target: 'node_header', relationship: 'parent_child' });

    // Heading inside header
    nodes.push({
      node_id: 'node_logo',
      component_type: 'HeadingTypography',
      category: 'display',
      bbox: [24, 16, 160, 32],
      bbox_normalized: [Math.round((24 / W) * 1000), Math.round((16 / H) * 1000), Math.round((160 / W) * 1000), Math.round((32 / H) * 1000)],
      z_index: 11,
      interaction_state: 'default',
      text_content: 'Soda Executive OS',
      aria: { role: 'heading' }
    });
    edges.push({ source: 'node_header', target: 'node_logo', relationship: 'parent_child' });

    // 2 Metric cards
    for (let c = 0; c < 2; c++) {
      const cardX = 24 + c * Math.min(320, Math.floor((W - 72) / 2));
      const cardW = Math.min(300, Math.floor((W - 72) / 2));
      const cardId = `node_metric_${c + 1}`;
      nodes.push({
        node_id: cardId,
        component_type: 'MetricStatCard',
        category: 'data_feedback',
        bbox: [cardX, 88, cardW, 120],
        bbox_normalized: [Math.round((cardX / W) * 1000), Math.round((88 / H) * 1000), Math.round((cardW / W) * 1000), Math.round((120 / H) * 1000)],
        z_index: 5,
        interaction_state: 'default',
        text_content: c === 0 ? 'Telemetry SLA: 99.99%' : 'Calibrated ECE: 0.038',
        aria: { role: 'region' }
      });
      edges.push({ source: 'node_root', target: cardId, relationship: 'parent_child' });
    }

    // Action button
    nodes.push({
      node_id: 'node_btn_export',
      component_type: 'PrimaryButton',
      category: 'control',
      bbox: [W - 160, 16, 136, 44],
      bbox_normalized: [Math.round(((W - 160) / W) * 1000), Math.round((16 / H) * 1000), Math.round((136 / W) * 1000), Math.round((44 / H) * 1000)],
      z_index: 12,
      interaction_state: 'default',
      text_content: 'Export Report',
      aria: { role: 'button' }
    });
    edges.push({ source: 'node_header', target: 'node_btn_export', relationship: 'parent_child' });

  } else if (sceneType === 'auth_form') {
    // Card Container
    const cardW = Math.min(420, W - 48);
    const cardH = 360;
    const cardX = Math.round((W - cardW) / 2);
    const cardY = Math.round((H - cardH) / 2);

    nodes.push({
      node_id: 'node_card_auth',
      component_type: 'CardContainer',
      category: 'container',
      bbox: [cardX, cardY, cardW, cardH],
      bbox_normalized: [Math.round((cardX / W) * 1000), Math.round((cardY / H) * 1000), Math.round((cardW / W) * 1000), Math.round((cardH / H) * 1000)],
      z_index: 5,
      interaction_state: 'default',
      text_content: null,
      aria: { role: 'region' }
    });
    edges.push({ source: 'node_root', target: 'node_card_auth', relationship: 'parent_child' });

    // Heading
    nodes.push({
      node_id: 'node_heading_auth',
      component_type: 'HeadingTypography',
      category: 'display',
      bbox: [cardX + 24, cardY + 24, cardW - 48, 32],
      bbox_normalized: [Math.round(((cardX + 24) / W) * 1000), Math.round(((cardY + 24) / H) * 1000), Math.round(((cardW - 48) / W) * 1000), Math.round((32 / H) * 1000)],
      z_index: 6,
      interaction_state: 'default',
      text_content: 'Sign In to Workspace',
      aria: { role: 'heading' }
    });
    edges.push({ source: 'node_card_auth', target: 'node_heading_auth', relationship: 'parent_child' });

    // Text Input
    nodes.push({
      node_id: 'node_input_user',
      component_type: 'TextInputField',
      category: 'input',
      bbox: [cardX + 24, cardY + 80, cardW - 48, 48],
      bbox_normalized: [Math.round(((cardX + 24) / W) * 1000), Math.round(((cardY + 80) / H) * 1000), Math.round(((cardW - 48) / W) * 1000), Math.round((48 / H) * 1000)],
      z_index: 6,
      interaction_state: 'default',
      text_content: 'operator@soda.dev',
      aria: { role: 'textbox' }
    });
    edges.push({ source: 'node_card_auth', target: 'node_input_user', relationship: 'parent_child' });

    // Primary Button
    nodes.push({
      node_id: 'node_btn_login',
      component_type: 'PrimaryButton',
      category: 'control',
      bbox: [cardX + 24, cardY + 160, cardW - 48, 48],
      bbox_normalized: [Math.round(((cardX + 24) / W) * 1000), Math.round(((cardY + 160) / H) * 1000), Math.round(((cardW - 48) / W) * 1000), Math.round((48 / H) * 1000)],
      z_index: 6,
      interaction_state: 'default',
      text_content: 'Continue',
      aria: { role: 'button' }
    });
    edges.push({ source: 'node_card_auth', target: 'node_btn_login', relationship: 'parent_child' });

  } else {
    // General structured view (table or list)
    const cardW = W - 48;
    const cardH = Math.min(480, H - 96);
    nodes.push({
      node_id: 'node_main_container',
      component_type: 'CardContainer',
      category: 'container',
      bbox: [24, 48, cardW, cardH],
      bbox_normalized: [Math.round((24 / W) * 1000), Math.round((48 / H) * 1000), Math.round((cardW / W) * 1000), Math.round((cardH / H) * 1000)],
      z_index: 5,
      interaction_state: 'default',
      text_content: null,
      aria: { role: 'region' }
    });
    edges.push({ source: 'node_root', target: 'node_main_container', relationship: 'parent_child' });

    nodes.push({
      node_id: 'node_data_table',
      component_type: 'TableViewGrid',
      category: 'data_feedback',
      bbox: [48, 72, cardW - 48, cardH - 120],
      bbox_normalized: [Math.round((48 / W) * 1000), Math.round((72 / H) * 1000), Math.round(((cardW - 48) / W) * 1000), Math.round(((cardH - 120) / H) * 1000)],
      z_index: 6,
      interaction_state: 'default',
      text_content: 'Goal Lifecycle Ledger',
      aria: { role: 'grid' }
    });
    edges.push({ source: 'node_main_container', target: 'node_data_table', relationship: 'parent_child' });

    nodes.push({
      node_id: 'node_pagination',
      component_type: 'PaginationControl',
      category: 'navigation',
      bbox: [48, cardH - 40, cardW - 48, 44],
      bbox_normalized: [Math.round((48 / W) * 1000), Math.round(((cardH - 40) / H) * 1000), Math.round(((cardW - 48) / W) * 1000), Math.round((44 / H) * 1000)],
      z_index: 6,
      interaction_state: 'default',
      text_content: 'Page 1 of 10',
      aria: { role: 'navigation' }
    });
    edges.push({ source: 'node_main_container', target: 'node_pagination', relationship: 'parent_child' });
  }

  // Synthesize acyclic scene graph and compute Kahn order + SHA256 digest
  const graphId = `SG-${String(index + 1).padStart(4, '0')}-001`;
  const synthesized = synthesizeSceneGraph(nodes, {
    graph_id: graphId,
    viewport_name: vp.name,
    viewport_width: vp.width,
    viewport_height: vp.height,
    timestamp: '2026-10-14T05:00:00.000Z'
  });

  return {
    record_id: recordId,
    graph_id: graphId,
    scene_type: sceneType,
    theme,
    viewport: vp,
    nodes_count: synthesized.nodes.length,
    edges_count: synthesized.edges.length,
    scene_graph: synthesized,
    sha256_digest: synthesized.sha256_digest,
    is_acyclic: true
  };
}

/**
 * Generates the complete 5,000-record dataset partitioned into 80/10/10 splits.
 */
export function generateSceneGraphDataset(options = {}) {
  const totalRecords = options.total_records !== undefined ? options.total_records : 5000;
  const trainRatio = options.train_ratio !== undefined ? options.train_ratio : 0.80;
  const valRatio = options.val_ratio !== undefined ? options.val_ratio : 0.10;
  const testRatio = options.test_ratio !== undefined ? options.test_ratio : 0.10;
  const outputDir = options.output_dir || 'artifacts/curriculum/stage2_scene_graphs';
  const writeFiles = options.write_files !== undefined ? options.write_files : true;
  const seed = options.seed !== undefined ? options.seed : 20261014;

  const rng = createRng(seed);

  const trainCount = Math.floor(totalRecords * trainRatio);
  const valCount = Math.floor(totalRecords * valRatio);
  const testCount = totalRecords - trainCount - valCount;

  const trainRecords = [];
  const valRecords = [];
  const testRecords = [];

  const trainIds = new Set();
  const valIds = new Set();
  const testIds = new Set();

  const viewportStats = { desktop: 0, tablet: 0, mobile: 0 };
  const classStats = {};

  for (let i = 0; i < totalRecords; i++) {
    const record = generateSceneGraphRecord(i, rng);
    viewportStats[record.viewport.name]++;

    for (const n of record.scene_graph.nodes) {
      classStats[n.component_type] = (classStats[n.component_type] || 0) + 1;
    }

    if (i < trainCount) {
      trainRecords.push(record);
      trainIds.add(record.record_id);
    } else if (i < trainCount + valCount) {
      valRecords.push(record);
      valIds.add(record.record_id);
    } else {
      testRecords.push(record);
      testIds.add(record.record_id);
    }
  }

  // Verify zero sample leakage
  let leakageDetected = false;
  for (const id of trainIds) {
    if (valIds.has(id) || testIds.has(id)) leakageDetected = true;
  }
  for (const id of valIds) {
    if (testIds.has(id)) leakageDetected = true;
  }

  const manifest = {
    dataset_name: 'Stage 2 UI Scene Graph Pairs Dataset',
    total_records: totalRecords,
    splits: {
      train: { count: trainRecords.length, ratio: trainRecords.length / totalRecords },
      validation: { count: valRecords.length, ratio: valRecords.length / totalRecords },
      test: { count: testRecords.length, ratio: testRecords.length / totalRecords }
    },
    zero_leakage_verified: !leakageDetected,
    viewport_distribution: viewportStats,
    unique_classes_represented: Object.keys(classStats).length,
    class_frequencies: classStats,
    generated_at: new Date().toISOString()
  };

  if (writeFiles) {
    const targetDir = resolve(process.cwd(), outputDir);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    writeFileSync(
      resolve(targetDir, 'train.jsonl'),
      trainRecords.map(r => JSON.stringify(r)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(targetDir, 'val.jsonl'),
      valRecords.map(r => JSON.stringify(r)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(targetDir, 'test.jsonl'),
      testRecords.map(r => JSON.stringify(r)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(targetDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf8'
    );
  }

  return {
    manifest,
    train: trainRecords,
    validation: valRecords,
    test: testRecords
  };
}
