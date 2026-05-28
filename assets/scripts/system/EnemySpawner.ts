import { _decorator, Component, Node, Prefab, instantiate, view, Vec3 } from 'cc';
import { Nailong } from '../entity/Nailong';
const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {
    @property(Prefab)
    nailongPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: 'The World node enemies are parented to (scrolls with the grid).' })
    worldNode: Node | null = null;

    @property({ type: Node, tooltip: 'Node enemies will chase (usually the Player).' })
    target: Node | null = null;

    @property
    spawnsPerSecond: number = 2;

    @property
    spawnMargin: number = 80;

    private _tgt: Vec3 = new Vec3();

    onEnable() {
        this.schedule(this.spawnOne, 1 / this.spawnsPerSecond);
    }

    onDisable() {
        this.unschedule(this.spawnOne);
    }

    private spawnOne = () => {
        if (!this.nailongPrefab || !this.worldNode || !this.target) return;

        this.target.getWorldPosition(this._tgt);
        const vs = view.getVisibleSize();
        const halfW = vs.width * 0.5;
        const halfH = vs.height * 0.5;

        let wx = this._tgt.x;
        let wy = this._tgt.y;
        switch (Math.floor(Math.random() * 4)) {
            case 0: wx -= halfW + this.spawnMargin; wy += (Math.random() * 2 - 1) * halfH; break;
            case 1: wx += halfW + this.spawnMargin; wy += (Math.random() * 2 - 1) * halfH; break;
            case 2: wy -= halfH + this.spawnMargin; wx += (Math.random() * 2 - 1) * halfW; break;
            case 3: wy += halfH + this.spawnMargin; wx += (Math.random() * 2 - 1) * halfW; break;
        }

        const node = instantiate(this.nailongPrefab);
        const nailong = node.getComponent(Nailong);
        if (nailong) nailong.target = this.target;

        this.worldNode.addChild(node);
        node.setWorldPosition(wx, wy, 0);
    };
}
