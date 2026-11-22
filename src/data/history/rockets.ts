import { season } from './build';

const C: [string, string] = ['#CE1141', '#000000'];
const R = (y: number, r: string) => season('hou', 'Houston', 'Rockets', y, C, r);

export const rockets = [
  R(1977, `
    Rudy Tomjanovich|SF/PF|85|28|scorer
    Moses Malone|C|86|21|big
    Calvin Murphy|PG|84|28|scorer
    John Lucas|PG|79|23|playmaker
    Mike Newlin|SG|76|27|shooter
    Kevin Kunnert|C|74|25|big
    Dwight Jones|PF|72|25|big
  `),
  R(1981, `
    Moses Malone|C|94|25|big
    Calvin Murphy|PG|82|32|scorer
    Rudy Tomjanovich|SF/PF|80|32|scorer
    Robert Reid|SF|78|25|twoway
    Billy Paultz|C|74|32|big
    Tom Henderson|PG|72|28|playmaker
    Allen Leavell|PG|72|23|scorer
  `),
  R(1986, `
    Hakeem Olajuwon|C|92|23|unicorn
    Ralph Sampson|C/PF|88|25|unicorn
    John Lucas|PG|79|32|playmaker
    Lewis Lloyd|SG|78|26|scorer
    Rodney McCray|SF|78|24|defender
    Robert Reid|SF|77|30|twoway
    Mitchell Wiggins|SG|74|26|slasher
    Jim Petersen|PF/C|70|24|big
  `),
  R(1994, `
    Hakeem Olajuwon|C|98|31|unicorn
    Otis Thorpe|PF|82|31|big
    Vernon Maxwell|SG|79|28|scorer
    Kenny Smith|PG|78|28|shooter
    Robert Horry|PF/SF|76|23|stretch
    Mario Elie|SG/SF|75|30|wing3d
    Sam Cassell|PG|75|24|scorer
    Carl Herrera|PF|72|27|big
  `),
  R(1995, `
    Hakeem Olajuwon|C|97|32|unicorn
    Clyde Drexler|SG|88|32|slasher
    Kenny Smith|PG|77|29|shooter
    Robert Horry|PF/SF|77|24|stretch
    Sam Cassell|PG|76|25|scorer
    Mario Elie|SG/SF|76|31|wing3d
    Pete Chilcutt|PF|70|26|stretch
    Chucky Brown|PF|70|26|big
  `),
  R(2009, `
    Yao Ming|C|89|28|big|40
    Ron Artest|SF|82|29|defender
    Luis Scola|PF|79|28|big
    Shane Battier|SF|78|30|wing3d
    Aaron Brooks|PG|76|24|scorer
    Kyle Lowry|PG|75|22|defender
    Carl Landry|PF|75|25|scorer
    Tracy McGrady|SG/SF|80|29|scorer|30
    Von Wafer|SG|72|23|shooter
  `),
  R(2018, `
    James Harden|SG/PG|97|28|scorer
    Chris Paul|PG|90|32|playmaker
    Clint Capela|C|82|23|rim
    Eric Gordon|SG|80|29|shooter
    Trevor Ariza|SF|78|32|wing3d
    P.J. Tucker|PF|76|32|defender
    Luc Mbah a Moute|SF/PF|74|31|defender
    Gerald Green|SF|74|32|shooter
    Ryan Anderson|PF|74|29|stretch
  `),
];
