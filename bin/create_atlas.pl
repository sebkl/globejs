#!/usr/bin/perl
use Image::Magick;
my @textureConfig = (
	{
		r => "atlas/texture.png:r",
		g => "atlas/texture.png:g",
		b => "atlas/texture.png:b",
		a => "atlas/heightmap.png:r"
	}
	,{
		#r => "atlas/countrymap.png:r",
		g => "atlas/borders.png:r",
		b => "atlas/city.png:r",
		#a => "atlas/mask.png:r"
	}
);

my @mapConfig = ( 
	{
		r => "atlas/countrymap.png:r",
		g => "atlas/mask.png:r"
	}
);


##
## Some constant configurations.
##
my $aa_param = "True";
my %cIndexMap = (
	r => 0,
	g => 1,
	b => 2,
	a => 3
);
my $width = 4096; # Image fagment width
my $height = 2048; # Image fragment height

#my $width = 2048; # Image fagment width
#my $height = 1024; # Image fragment height



#my $width = 8192;
#my $height = 4096;
#my $width = 1024;
#my $height = 512;
#shift(@textureConfig);
my $textureFilename= shift || "atlas.png";
my $mapFilename = shift || "map.png";

sub buildImage($) {
	my $tcp = shift;
	my @tc = @{$tcp};
	my %files;
	my $totalHeight = int((@tc) * $height);
	my $singleSieString = $width."x".$height;
	my $outSizeString = $width."x".$totalHeight;

	my $ti = Image::Magick->new;
	$ti->Set(size=>$outSizeString);
	$ti->ReadImage("xc:white");
	$ti->Set(alpha=>'On');
	$ti->Set(antialias=>$aa_param);
	#$ti->Set(alpha=>'Activate');
	#$ti->Transparent(color=>'white');
	foreach my $iref (@tc) {
		foreach my $cref (keys(%{$iref})) {
			my $val = $iref->{$cref};

			my ($iname,$col) = split(/:/,$val);
			unless (defined($files{$iname})) {
				print STDERR "Reading new image file: ".$iname."\n";
				my $nf = Image::Magick->new;
				$nf->Read($iname);
				print STDERR "Resizing image.\n";
				$nf->Set(antialias=>$aa_param);
				$nf->Sample(width=>$width,height=>$height);
				$files{$iname} = $nf;
	#			$nf->Write(filename=>$iname."_xxx.png");
			}
		}
	}


	for (my $i = 0; $i < @tc; $i++) {
		print STDERR "Processing Image ".($i+1)." of ".@tc."\n";

		my $theight = (($i+1) * $height);
		my $fheight = (($i) * $height);
		my $stc = $tc[$i];

		my $y = 0;
		for (my $ty = $fheight; $ty <= $theight;$ty++) {
			print STDERR "DONE: ".int(($y/$height)*100)."%\r";
			for (my $x = 0; $x < $width;$x++) {
				my %pixel;
				foreach my $ci (keys(%{$stc})) {
					my $imgString = $stc->{$ci};
					my ($iname,$cii)  = split(/:/,$imgString);
					my $img = $files{$iname};
					my @vals = $img->GetPixel(x=>$x,y=>$y);
					my $v = $vals[$cIndexMap{$cii}];
					$pixel{$ci} = $v;
				}
				my @nc = ($pixel{r},$pixel{g},$pixel{b},$pixel{a});
				my @nca = ($pixel{a},$pixel{a},$pixel{a},$pixel{a});
				#print STDERR $pixel{r}." ".$pixel{g}." ".$pixel{b}." ".$pixel{a}."\n";
				$ti->SetPixel(x=>$x,y=>$ty,color=>\@nc);
				$ti->SetPixel(x=>$x,y=>$ty,channel=>'Alpha',color=>\@nca);
			}
			$y++;
		}
		print "\n";
	}

	return $ti;
}

print STDOUT "Writing output image: $textureFilename \n";
my $textureImage = buildImage(\@textureConfig);
$textureImage->Write(filename=>$textureFilename, compression=>'None');
$textureImage->Write($textureFilename);
print STDOUT "Writing output image: $mapFilename \n";
my $mapImage = buildImage(\@mapConfig);
$mapImage->Write(filename=>$mapFilename, compression=>'None');
$mapImage->Write($mapFilename);

