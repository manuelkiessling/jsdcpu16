:loop ADD A, 10
IFN A, 20
ADD B, 1
SET PC, loop

a802
d00d
8412
7dc1
0000



SET B, 10
:loop ADD A, 3
IFG A, B
ADD B, 4
SET PC, loop

a811
8c02
040e
9012
7dc1
0001
