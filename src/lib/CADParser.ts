export interface CADWall {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  openings: Array<{
    type: 'door' | 'window';
    offset: number;
    width: number;
    height?: number;
    sillHeight?: number;
  }>;
}

export class CADParser {
  private currentThickness: number = 30;
  private currentX: number = 0;
  private currentY: number = 0;
  private currentAngle: number = 0;
  private walls: CADWall[] = [];
  private errors: string[] = [];

  private reset() {
    this.currentThickness = 30;
    this.currentX = 0;
    this.currentY = 0;
    this.currentAngle = 0;
    this.walls = [];
    this.errors = [];
  }

  public parse(inputString: string) {
    this.reset();
    const lines = inputString.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;

      const parts = line.split(/\s+/);
      const cmd = parts[0];

      try {
        switch (cmd) {
          case 'THICK':
            if (parts.length < 2) throw "THICK needs a value";
            this.currentThickness = parseFloat(parts[1]);
            break;
          case 'START':
            if (parts.length < 3) throw "START needs X and Y";
            this.currentX = parseFloat(parts[1]);
            this.currentY = parseFloat(parts[2]);
            break;
          case 'WALL':
            if (parts.length < 3) throw "WALL needs DIRECTION and LENGTH";
            this.addWall(parts[1], parseFloat(parts[2]));
            break;
          case 'DOOR':
            if (parts.length < 3) throw "DOOR needs OFFSET and WIDTH";
            this.addOpening('door', parseFloat(parts[1]), parseFloat(parts[2]));
            break;
          case 'WINDOW':
            if (parts.length < 3) throw "WINDOW needs OFFSET and WIDTH";
            this.addOpening('window', parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3] || '150'), parseFloat(parts[4] || '90'));
            break;
          case 'TURN':
            if (parts.length < 3) throw "TURN needs LEFT/RIGHT and ANGLE";
            const dir = parts[1];
            const angle = parseFloat(parts[2]);
            if (dir === 'LEFT') this.currentAngle += angle;
            else if (dir === 'RIGHT') this.currentAngle -= angle;
            else throw "TURN direction must be LEFT or RIGHT";
            break;
          default:
            // Relaxed parsing: if it looks like a coordinate, ignore or log
            if (!isNaN(parseFloat(cmd))) continue; 
            throw `Unknown command: ${cmd}`;
        }
      } catch (e) {
        this.errors.push(`Line ${i + 1}: ${e}`);
      }
    }

    return {
      success: this.errors.length === 0,
      walls: this.walls,
      errors: this.errors,
      startX: this.walls.length > 0 ? this.walls[0].startX : 0,
      startY: this.walls.length > 0 ? this.walls[0].startY : 0
    };
  }

  private addWall(direction: string, length: number) {
    // Standard directions or handle currently set angle
    if (direction === 'UP' || direction === 'NORTH') this.currentAngle = 90;
    else if (direction === 'DOWN' || direction === 'SOUTH') this.currentAngle = 270;
    else if (direction === 'LEFT' || direction === 'WEST') this.currentAngle = 180;
    else if (direction === 'RIGHT' || direction === 'EAST') this.currentAngle = 0;
    // else it uses the "TURN" modified angle

    const rad = (this.currentAngle * Math.PI) / 180;
    const endX = this.currentX + length * Math.cos(rad);
    const endY = this.currentY + length * Math.sin(rad);

    const newWall: CADWall = {
      startX: this.currentX,
      startY: this.currentY,
      endX: endX,
      endY: endY,
      thickness: this.currentThickness,
      openings: []
    };

    this.walls.push(newWall);
    this.currentX = endX;
    this.currentY = endY;
  }

  private addOpening(type: 'door' | 'window', offset: number, width: number, h?: number, sh?: number) {
    if (this.walls.length === 0) throw `Cannot add ${type}: No wall exists!`;
    const lastWall = this.walls[this.walls.length - 1];
    lastWall.openings.push({ type, offset, width, height: h, sillHeight: sh });
  }
}
