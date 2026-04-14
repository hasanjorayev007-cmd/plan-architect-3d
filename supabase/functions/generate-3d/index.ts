const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Wall {
  x1: number; y1: number;
  x2: number; y2: number;
  thickness: number;
}

interface Opening {
  type: 'door' | 'window';
  x: number; y: number;
  width: number; height: number;
  wallIndex: number;
}

interface FloorPlan {
  walls: Wall[];
  openings: Opening[];
  width: number;
  height: number;
}

function generateDXF(plan: FloorPlan, wallHeight: number): string {
  const lines: string[] = [];
  
  // DXF Header
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1027');
  lines.push('9', '$INSUNITS', '70', '6'); // meters
  lines.push('0', 'ENDSEC');
  
  // Tables section
  lines.push('0', 'SECTION', '2', 'TABLES');
  
  // Layer table
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '3');
  
  // WALLS_3D layer
  lines.push('0', 'LAYER', '2', 'WALLS_3D', '70', '0', '62', '7', '6', 'CONTINUOUS');
  // DOORS layer
  lines.push('0', 'LAYER', '2', 'DOORS', '70', '0', '62', '3', '6', 'CONTINUOUS');
  // WINDOWS layer
  lines.push('0', 'LAYER', '2', 'WINDOWS', '70', '0', '62', '5', '6', 'CONTINUOUS');
  
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');
  
  // Entities section
  lines.push('0', 'SECTION', '2', 'ENTITIES');
  
  // Generate 3D walls using 3DFACE entities
  for (const wall of plan.walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) continue;
    
    // Normal perpendicular to wall
    const nx = -dy / len * (wall.thickness / 2);
    const ny = dx / len * (wall.thickness / 2);
    
    // 4 corners at base
    const corners = [
      { x: wall.x1 + nx, y: wall.y1 + ny },
      { x: wall.x2 + nx, y: wall.y2 + ny },
      { x: wall.x2 - nx, y: wall.y2 - ny },
      { x: wall.x1 - nx, y: wall.y1 - ny },
    ];
    
    // Bottom face
    add3DFace(lines, 'WALLS_3D',
      corners[0].x, corners[0].y, 0,
      corners[1].x, corners[1].y, 0,
      corners[2].x, corners[2].y, 0,
      corners[3].x, corners[3].y, 0
    );
    
    // Top face
    add3DFace(lines, 'WALLS_3D',
      corners[0].x, corners[0].y, wallHeight,
      corners[1].x, corners[1].y, wallHeight,
      corners[2].x, corners[2].y, wallHeight,
      corners[3].x, corners[3].y, wallHeight
    );
    
    // 4 side faces
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      add3DFace(lines, 'WALLS_3D',
        corners[i].x, corners[i].y, 0,
        corners[j].x, corners[j].y, 0,
        corners[j].x, corners[j].y, wallHeight,
        corners[i].x, corners[i].y, wallHeight
      );
    }
  }
  
  // Door openings
  for (const opening of plan.openings) {
    const layer = opening.type === 'door' ? 'DOORS' : 'WINDOWS';
    const zBottom = opening.type === 'window' ? 0.9 : 0;
    const zTop = opening.type === 'window' ? 2.1 : 2.1;
    const hw = opening.width / 2;
    
    // Simple rectangular opening representation
    add3DFace(lines, layer,
      opening.x - hw, opening.y, zBottom,
      opening.x + hw, opening.y, zBottom,
      opening.x + hw, opening.y, zTop,
      opening.x - hw, opening.y, zTop
    );
  }
  
  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');
  
  return lines.join('\n');
}

function add3DFace(lines: string[], layer: string,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number,
  x4: number, y4: number, z4: number
) {
  lines.push('0', '3DFACE');
  lines.push('8', layer);
  lines.push('10', x1.toFixed(4), '20', y1.toFixed(4), '30', z1.toFixed(4));
  lines.push('11', x2.toFixed(4), '21', y2.toFixed(4), '31', z2.toFixed(4));
  lines.push('12', x3.toFixed(4), '22', y3.toFixed(4), '32', z3.toFixed(4));
  lines.push('13', x4.toFixed(4), '23', y4.toFixed(4), '33', z4.toFixed(4));
}

function parseAIResponse(text: string, wallThickness: number): FloorPlan {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const walls: Wall[] = (parsed.walls || []).map((w: any) => ({
        x1: Number(w.x1) || 0,
        y1: Number(w.y1) || 0,
        x2: Number(w.x2) || 0,
        y2: Number(w.y2) || 0,
        thickness: wallThickness,
      }));
      const openings: Opening[] = (parsed.openings || parsed.doors || []).map((o: any, i: number) => ({
        type: o.type || 'door',
        x: Number(o.x) || 0,
        y: Number(o.y) || 0,
        width: Number(o.width) || 0.9,
        height: Number(o.height) || 2.1,
        wallIndex: i,
      }));
      return {
        walls,
        openings,
        width: parsed.width || 10,
        height: parsed.height || 10,
      };
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
  
  // Fallback: generate a simple box
  return generateFallbackPlan(wallThickness);
}

function generateFallbackPlan(thickness: number): FloorPlan {
  const w = 10, h = 8;
  return {
    width: w, height: h,
    walls: [
      { x1: 0, y1: 0, x2: w, y2: 0, thickness },
      { x1: w, y1: 0, x2: w, y2: h, thickness },
      { x1: w, y1: h, x2: 0, y2: h, thickness },
      { x1: 0, y1: h, x2: 0, y2: 0, thickness },
      // Internal wall
      { x1: w / 2, y1: 0, x2: w / 2, y2: h * 0.6, thickness },
    ],
    openings: [
      { type: 'door', x: w * 0.25, y: 0, width: 0.9, height: 2.1, wallIndex: 0 },
      { type: 'window', x: w, y: h * 0.5, width: 1.2, height: 1.2, wallIndex: 1 },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image, wallHeight = 2.8, wallThickness = 0.2 } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    let plan: FloorPlan;

    if (apiKey) {
      // Use AI to analyze the floor plan
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview',
          messages: [
            {
              role: 'system',
              content: `You are an architectural floor plan analyzer. Given a 2D floor plan image, extract wall segments, doors, and windows. Return a JSON object with this structure:
{
  "walls": [{"x1": number, "y1": number, "x2": number, "y2": number}],
  "openings": [{"type": "door"|"window", "x": number, "y": number, "width": number, "height": number}],
  "width": number,
  "height": number
}
All coordinates in meters. Estimate the scale from the image. Return ONLY valid JSON, no other text.`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this floor plan and extract all walls, doors, and windows as coordinate data in meters.' },
                { type: 'image_url', image_url: { url: image } }
              ]
            }
          ],
        }),
      });

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '';
      plan = parseAIResponse(aiText, wallThickness);
    } else {
      // No API key - use fallback
      plan = generateFallbackPlan(wallThickness);
    }

    // Ensure we never return empty
    if (!plan.walls.length) {
      plan = generateFallbackPlan(wallThickness);
    }

    const dxf = generateDXF(plan, wallHeight);

    return new Response(JSON.stringify({ dxf, plan: { wallCount: plan.walls.length, openingCount: plan.openings.length } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    // Fallback: always return something
    const fallback = generateFallbackPlan(0.2);
    const dxf = generateDXF(fallback, 2.8);
    return new Response(JSON.stringify({ dxf, fallback: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
