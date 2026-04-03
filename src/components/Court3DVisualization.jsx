import React, { useEffect, useRef, useState } from 'react';

export default function Court3DVisualization({ matchData, playerIndex }) {
  const canvasRef = useRef(null);
  const [state, setStateInternal] = useState({
    azimuth: -15 * Math.PI / 180,
    elevation: 22 * Math.PI / 180,
    zoom: 13,
    drag: false,
    dragX: 0,
    dragY: 0,
    dragAzi: 0,
    dragEl: 0,
    tooltip: null,
    tooltipX: 0,
    tooltipY: 0,
    hitBoxes: [],
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Debug logging
  useEffect(() => {
    console.log('Court3DVisualization props:', {
      playerIndex,
      matchDataExists: !!matchData,
    });
    
    if (matchData) {
      const rallies = matchData?.game_stats?.rallies || matchData?.gameStats?.rallies || [];
      console.log('Match rallies:', rallies.length);
      
      if (rallies.length > 0) {
        const firstRally = rallies[0];
        const shots = firstRally.shots || [];
        console.log('First rally shots:', shots.length);
        
        if (shots.length > 0) {
          console.log('First shot:', shots[0]);
          console.log('Player IDs in first rally:', shots.map(s => s.player_id));
        }
      }
    }
  }, [playerIndex, matchData]);

  // Constants
  const CRT_W = 20;
  const CRT_L = 44;
  const NET_Y = 22;
  const NVZ = 7;
  const CW = 1000;
  const CH = 600;
  const DEF_AZI = -15 * Math.PI / 180;
  const DEF_EL = 22 * Math.PI / 180;
  const DEF_ZOOM = 13;
  const MIN_EL = -85 * Math.PI / 180;
  const MAX_EL = 85 * Math.PI / 180;
  const MIN_ZOOM = 4;
  const MAX_ZOOM = 40;

  // Projection function
  const project = (wx, wy, wz = 0) => {
    const cx = wx - CRT_W / 2;
    const cy = wy - CRT_L / 2;

    const ax = cx * Math.cos(state.azimuth) - cy * Math.sin(state.azimuth);
    const ay = cx * Math.sin(state.azimuth) + cy * Math.cos(state.azimuth);

    const ez = ay * Math.sin(state.elevation) + wz * Math.cos(state.elevation);

    return [CW / 2 + ax * state.zoom, CH / 2 - ez * state.zoom];
  };

  // Helper functions
  const getTeam = (pid) => (pid <= 1 ? 'near' : 'far');

  const getTrajectory = (shot) => {
    if (!shot) return null;
    
    // Try multiple possible locations for trajectory data
    let traj = null;
    
    // Check resulting_ball_movement.trajectory
    if (shot.resulting_ball_movement?.trajectory) {
      traj = shot.resulting_ball_movement.trajectory;
    }
    // Check direct trajectory
    else if (shot.trajectory) {
      traj = shot.trajectory;
    }
    // Check resulting_ball_movement directly
    else if (shot.resulting_ball_movement?.start && shot.resulting_ball_movement?.end) {
      traj = shot.resulting_ball_movement;
    }
    
    if (!traj) return null;
    
    // Extract start, peak, end with multiple fallback options
    const s = traj.start?.location ?? traj.start;
    const e = traj.end?.location ?? traj.end;
    const pk = traj.peak?.location ?? traj.peak;
    
    if (!s || !e || !pk) return null;
    if (s.x == null || e.x == null || pk.x == null) return null;
    
    return {
      start: { x: s.x, y: s.y, z: s.z || 0 },
      peak: { x: pk.x, y: pk.y, z: pk.z || 2 },
      end: { x: e.x, y: e.y, z: e.z || 0 },
    };
  };

  const isFault = (shot) => {
    const f = shot.errors?.faults;
    return f && (f.net || f.short || f.out?.outcome || f.kitchen || f.excess_bounce || f.paddle_hit_net);
  };

  const arcColor = (shot, alpha = 1) => {
    // Burnt orange for errors and net hits
    if (shot.errors?.unforced || isFault(shot)) {
      return `rgba(204, 85, 0, ${alpha})`; // Burnt orange
    }
    
    const near = getTeam(shot.player_id) === 'near';
    if (near)
      return shot.is_final
        ? `rgba(74,222,128,${alpha})`
        : `rgba(134,239,172,${alpha * 0.8})`;
    else
      return shot.is_final
        ? `rgba(248,113,113,${alpha})`
        : `rgba(252,165,165,${alpha * 0.8})`;
  };

  // Draw court
  const drawCourt = (ctx) => {
    ctx.clearRect(0, 0, CW, CH);

    // Surface fill
    const corners = [
      project(0, 0),
      project(CRT_W, 0),
      project(CRT_W, CRT_L),
      project(0, CRT_L),
    ];
    ctx.beginPath();
    ctx.moveTo(...corners[0]);
    corners.slice(1).forEach((c) => ctx.lineTo(...c));
    ctx.closePath();
    ctx.fillStyle = '#edf1f5';
    ctx.fill();

    // Helper: draw a line between two court points
    const courtLine = (x0, y0, x1, y1, color = '#9aa4b0', lw = 1) => {
      ctx.beginPath();
      ctx.moveTo(...project(x0, y0));
      ctx.lineTo(...project(x1, y1));
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    // Outer boundary
    ctx.strokeStyle = '#8090a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(...corners[0]);
    corners.slice(1).forEach((c) => ctx.lineTo(...c));
    ctx.closePath();
    ctx.stroke();

    // NVZ (kitchen) lines
    courtLine(0, NET_Y - NVZ, CRT_W, NET_Y - NVZ);
    courtLine(0, NET_Y + NVZ, CRT_W, NET_Y + NVZ);

    // Center service lines
    courtLine(CRT_W / 2, 0, CRT_W / 2, NET_Y - NVZ);
    courtLine(CRT_W / 2, NET_Y + NVZ, CRT_W / 2, CRT_L);

    // Net ground shadow
    ctx.setLineDash([4, 3]);
    courtLine(0, NET_Y, CRT_W, NET_Y, '#a0aab8', 0.8);
    ctx.setLineDash([]);

    // Net posts
    const nL0 = project(-0.5, NET_Y, 0);
    const nL1 = project(-0.5, NET_Y, 3);
    const nR0 = project(CRT_W + 0.5, NET_Y, 0);
    const nR1 = project(CRT_W + 0.5, NET_Y, 3);

    // Net fill
    ctx.beginPath();
    ctx.moveTo(...nL0);
    ctx.lineTo(...nL1);
    ctx.lineTo(...nR1);
    ctx.lineTo(...nR0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(80,90,120,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#5a6882';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Net top bar
    ctx.beginPath();
    ctx.moveTo(...nL1);
    ctx.lineTo(...nR1);
    ctx.strokeStyle = '#687898';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Net vertical strands
    ctx.strokeStyle = 'rgba(90,105,140,0.35)';
    ctx.lineWidth = 0.6;
    for (let x = 1; x < CRT_W; x += 2) {
      ctx.beginPath();
      ctx.moveTo(...project(x, NET_Y, 0));
      ctx.lineTo(...project(x, NET_Y, 3));
      ctx.stroke();
    }

    // Labels
    ctx.font = '600 9px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8090a0';

    const nvzNear = project(CRT_W / 2, NET_Y - NVZ / 2);
    ctx.fillText('NVZ', nvzNear[0], nvzNear[1] + 4);

    const nvzFar = project(CRT_W / 2, NET_Y + NVZ / 2);
    ctx.fillText('NVZ', nvzFar[0], nvzFar[1] + 4);

    const netTop = project(CRT_W / 2, NET_Y, 3.6);
    ctx.fillText('NET', netTop[0], netTop[1] - 3);

    // Baseline labels
    ctx.font = '500 8px Segoe UI, sans-serif';
    ctx.fillStyle = '#6a7480';
    const blNear = project(CRT_W / 2, 0);
    ctx.fillText('BASELINE', blNear[0], blNear[1] + 14);
    const blFar = project(CRT_W / 2, CRT_L);
    ctx.fillText('BASELINE', blFar[0], blFar[1] - 6);
  };

  // Draw a single shot arc
  const drawArc = (ctx, shot, seqNum, alpha = 1, lw = 2) => {
    const traj = getTrajectory(shot);
    
    // If no trajectory, try to draw from location data
    if (!traj) {
      // Try to get location from shot data
      const loc = shot.location || shot.shot_location;
      if (!loc || loc.x == null || loc.y == null) {
        return null;
      }
      
      // Draw a simple dot at the shot location
      const color = arcColor(shot, alpha);
      const p = project(loc.x, loc.y, loc.z || 0);
      
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Sequence number
      if (seqNum !== null && alpha > 0.5) {
        ctx.font = 'bold 8px Segoe UI, sans-serif';
        ctx.fillStyle = `rgba(200,210,230,${alpha * 0.7})`;
        ctx.textAlign = 'center';
        ctx.fillText(seqNum, p[0], p[1] - 8);
      }
      
      return { mx: p[0], my: p[1], ex: p[0], ey: p[1], sx: p[0], sy: p[1] };
    }

    // Normalize: flip far-side shots
    const fromFar = traj.start.y > CRT_L / 2;
    const norm = (p) =>
      fromFar ? { x: CRT_W - p.x, y: CRT_L - p.y, z: p.z } : p;

    const start = norm(traj.start);
    const peak = norm(traj.peak);
    const end = norm(traj.end);

    // Sample 32 points along quadratic Bézier
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const mt = 1 - t;
      pts.push(
        project(
          mt * mt * start.x + 2 * t * mt * peak.x + t * t * end.x,
          mt * mt * start.y + 2 * t * mt * peak.y + t * t * end.y,
          mt * mt * start.z + 2 * t * mt * peak.z + t * t * end.z
        )
      );
    }

    const color = arcColor(shot, alpha);
    const isFin = shot.is_final;

    // Arc line
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    pts.slice(1).forEach((p) => ctx.lineTo(...p));
    ctx.strokeStyle = color;
    ctx.lineWidth = isFin ? lw + 0.8 : lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Start dot
    const sp = project(start.x, start.y, start.z);
    ctx.beginPath();
    ctx.arc(sp[0], sp[1], 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // End dot
    const ep = project(end.x, end.y, end.z);
    const r = isFin ? 5 : 3;
    ctx.beginPath();
    ctx.arc(ep[0], ep[1], r, 0, Math.PI * 2);
    ctx.fillStyle = isFin ? '#ffffff' : color;
    ctx.fill();
    if (isFin) {
      ctx.beginPath();
      ctx.arc(ep[0], ep[1], r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Sequence number
    if (seqNum !== null && alpha > 0.5) {
      ctx.font = 'bold 9px Segoe UI, sans-serif';
      ctx.fillStyle = `rgba(200,210,230,${alpha * 0.7})`;
      ctx.textAlign = 'center';
      ctx.fillText(seqNum, sp[0], sp[1] - 7);
    }

    const mid = pts[16];
    return { mx: mid[0], my: mid[1], ex: ep[0], ey: ep[1], sx: sp[0], sy: sp[1] };
  };

  // Generate tooltip HTML for a shot
  const generateTooltip = (shot) => {
    const rm = shot.resulting_ball_movement || {};
    const speed = rm.speed ? (rm.speed * 0.681818).toFixed(0) + ' mph' : '—';
    const netH = rm.height_over_net ? rm.height_over_net.toFixed(2) + ' ft' : '—';
    const qual = shot.quality?.overall ? (shot.quality.overall * 100).toFixed(0) + '%' : '—';
    const stype = shot.shot_type || shot.vertical_type || '—';
    const stroke = [shot.stroke_type, shot.stroke_side].filter(Boolean).join(' / ') || '—';
    const dir = rm.angles?.direction || '—';
    const dist = rm.distance ? rm.distance.toFixed(1) + ' ft' : '—';

    let badge = '';
    if (shot.is_final) {
      if (shot.errors?.unforced) {
        badge = '<span style="display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 0.68rem; font-weight: 700; margin-top: 7px; text-transform: uppercase; letter-spacing: 0.04em; background: #2a0e0e; color: #f87171;">Unforced Error</span>';
      } else if (shot.winner_type === 'clean') {
        badge = '<span style="display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 0.68rem; font-weight: 700; margin-top: 7px; text-transform: uppercase; letter-spacing: 0.04em; background: #0e2318; color: #4ade80;">Winner ✓</span>';
      }
    }
    if (isFault(shot)) {
      badge += '<span style="display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 0.68rem; font-weight: 700; margin-top: 7px; text-transform: uppercase; letter-spacing: 0.04em; background: #1e1e0a; color: #facc15; margin-left: 4px;">Fault</span>';
    }

    return `
      <div style="font-size: 0.77rem;">
        <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 7px; color: ${arcColor(shot)};">${getTeam(shot.player_id).toUpperCase()} TEAM</div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Type</span><span style="color: #ddd; font-weight: 500;">${stype}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Stroke</span><span style="color: #ddd; font-weight: 500;">${stroke}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Direction</span><span style="color: #ddd; font-weight: 500;">${dir}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Speed</span><span style="color: #ddd; font-weight: 500;">${speed}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Net Clearance</span><span style="color: #ddd; font-weight: 500;">${netH}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Distance</span><span style="color: #ddd; font-weight: 500;">${dist}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px;"><span style="color: #888;">Quality</span><span style="color: #ddd; font-weight: 500;">${qual}</span></div>
        ${badge}
      </div>
    `;
  };

  // Draw all shots for player in the selected match
  const drawShots = (ctx) => {
    if (!matchData) {
      console.log('No match data to visualize');
      return [];
    }

    // Try both snake_case and camelCase
    const rallies = matchData?.game_stats?.rallies || matchData?.gameStats?.rallies;
    if (!rallies) {
      console.log('No rallies found in match data. Match keys:', Object.keys(matchData || {}));
      return [];
    }

    let shotCount = 0;
    let drawnCount = 0;
    let noTrajectoryCount = 0;
    let sampleShot = null;
    let playerIdCounts = {};
    const hitBoxes = [];

    rallies.forEach((rally, rallyIdx) => {
      const shots = rally.shots || [];
      shots.forEach((shot, shotIdx) => {
        // Track all player IDs we see
        playerIdCounts[shot.player_id] = (playerIdCounts[shot.player_id] || 0) + 1;
        
        // Only draw shots by this player
        if (shot.player_id !== playerIndex) return;

        shotCount++;
        
        // Save first shot for debugging
        if (!sampleShot) {
          sampleShot = shot;
          console.log('Sample shot data:', shot);
        }

        const pts = drawArc(ctx, shot, shotCount, 1, 2);
        if (pts) {
          hitBoxes.push({ ...pts, shot, idx: shotIdx, rallyIdx });
          drawnCount++;
        } else {
          noTrajectoryCount++;
        }
      });
    });

    console.log(`DrawShots: Total player shots=${shotCount}, Drawn=${drawnCount}, No trajectory=${noTrajectoryCount}, PlayerIndex=${playerIndex}`);
    console.log('Player ID distribution:', playerIdCounts);
    
    // If no shots found for this player, try drawing all shots as fallback
    if (shotCount === 0 && Object.keys(playerIdCounts).length > 0) {
      console.log('No shots found for playerIndex, drawing all shots as fallback');
      let fallbackCount = 0;
      
      rallies.forEach((rally) => {
        const shots = rally.shots || [];
        shots.forEach((shot) => {
          fallbackCount++;
          const pts = drawArc(ctx, shot, fallbackCount, 0.6, 1.5);
          if (pts) {
            hitBoxes.push({ ...pts, shot, idx: fallbackCount });
            drawnCount++;
          }
        });
      });
      
      console.log(`Fallback: Drew ${drawnCount} shots from all players`);
    }

    return hitBoxes;
  };

  // Main redraw function
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    drawCourt(ctx);
    const hitBoxes = drawShots(ctx);
    setStateInternal((prev) => ({ ...prev, hitBoxes }));
  };

  // Mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      setStateInternal((prev) => ({
        ...prev,
        drag: true,
        dragX: e.clientX,
        dragY: e.clientY,
        dragAzi: prev.azimuth,
        dragEl: prev.elevation,
      }));
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
      if (stateRef.current.drag) {
        const newAzi = stateRef.current.dragAzi + (e.clientX - stateRef.current.dragX) * 0.007;
        const newEl = Math.max(
          MIN_EL,
          Math.min(MAX_EL, stateRef.current.dragEl - (e.clientY - stateRef.current.dragY) * 0.006)
        );

        setStateInternal((prev) => ({
          ...prev,
          azimuth: newAzi,
          elevation: newEl,
          tooltip: null,
        }));
        return;
      }

      // Tooltip hover detection
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let best = null;
      let minD = 16;
      stateRef.current.hitBoxes.forEach((hb) => {
        const d = Math.min(
          Math.hypot(mx - hb.sx, my - hb.sy),
          Math.hypot(mx - hb.mx, my - hb.my),
          Math.hypot(mx - hb.ex, my - hb.ey)
        );
        if (d < minD) {
          minD = d;
          best = hb;
        }
      });

      if (!best) {
        setStateInternal((prev) => ({ ...prev, tooltip: null }));
        canvas.style.cursor = 'crosshair';
        return;
      }

      canvas.style.cursor = 'pointer';
      const tooltipHtml = generateTooltip(best.shot);
      let tx = mx + 14;
      let ty = my - 12;

      // Adjust tooltip position if it goes off screen
      if (tx + 210 > CW) tx = mx - 224;
      if (ty + 200 > CH) ty = CH - 200 - 8;

      setStateInternal((prev) => ({
        ...prev,
        tooltip: tooltipHtml,
        tooltipX: tx,
        tooltipY: ty,
      }));
    };

    const handleMouseUp = () => {
      setStateInternal((prev) => ({ ...prev, drag: false }));
      canvas.style.cursor = 'grab';
    };

    const handleMouseLeave = () => {
      setStateInternal((prev) => ({ ...prev, tooltip: null }));
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * (1 - e.deltaY * 0.0012)));
      setStateInternal((prev) => ({ ...prev, zoom: newZoom }));
    };

    const handleDoubleClick = () => {
      setStateInternal((prev) => ({
        ...prev,
        azimuth: DEF_AZI,
        elevation: DEF_EL,
        zoom: DEF_ZOOM,
      }));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);

  // Redraw on state change
  useEffect(() => {
    redraw();
  }, [state, matchData, playerIndex]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = window.devicePixelRatio || 1;
    canvas.width = CW * DPR;
    canvas.height = CH * DPR;
    canvas.style.width = CW + 'px';
    canvas.style.height = CH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    redraw();
  }, []);

  if (!matchData || playerIndex === undefined || playerIndex === -1) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-white uppercase text-sm tracking-wider mb-4 font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
          3D Shot Visualization
        </h3>
        <div className="text-gray-400 text-center py-8">
          No match data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 w-full mb-12">
      <h3 className="text-white uppercase text-sm tracking-wider mb-4 font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
        3D Shot Visualization
      </h3>
      <div className="relative bg-gray-900 rounded-lg overflow-auto w-full flex items-center justify-center" style={{ height: CH }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'grab', margin: '0 auto' }}
        />
        {state.tooltip && (
          <div
            className="absolute bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs text-white pointer-events-none"
            style={{
              left: state.tooltipX,
              top: state.tooltipY,
              minWidth: '190px',
              zIndex: 10,
              backgroundColor: 'rgba(12, 14, 20, 0.96)',
              backdropFilter: 'blur(6px)',
            }}
            dangerouslySetInnerHTML={{ __html: state.tooltip }}
          />
        )}
      </div>
      <div className="mt-4 text-xs text-gray-400 text-center">
        Drag to rotate · Scroll to zoom · Double-click to reset
      </div>
    </div>
  );
}
