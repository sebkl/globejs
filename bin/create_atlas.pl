#!/usr/bin/perl
use Image::Magick;
my @config = (
	{
		r => "atlas/texture.png:r",
		g => "atlas/texture.png:g",
		b => "atlas/texture.png:b",
		a => "atlas/heightmap.png:r"
	}, 
	{
		r => "atlas/countrymap.png:r",
		g => "atlas/borders.png:r",
		b => "atlas/city.png:r",
		a => "atlas/mask.png:r"
	}
);

#shift(@config);


my $width = 4096;
my $height = 2048;
#my $width = 8192;
#my $height = 4096;
#my $width = 1024;
#my $height = 512;
my $totalHeight = int((@config) * $height);
my $outFilename= shift || "atlas.png";

my %files;

sub getSingleSizeString() {
	return $width."x".$height;
}

sub getOutSizeString() {
	return $width."x".$totalHeight;
}

my $aa_param = "True";

#my $outImage = new Image::Magick;
my $outImage = Image::Magick->new;
$outImage->Set(size=>getOutSizeString());
$outImage->ReadImage("xc:white");
$outImage->Set(alpha=>'On');
$outImage->Set(antialias=>$aa_param);
#$outImage->Set(alpha=>'Activate');
#$outImage->Transparent(color=>'white');


#print STDERR $outImage->Get('size')." ".getOutSizeString()."\n";


foreach my $iref (@config) {
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

my %cIndexMap = (
	r => 0,
	g => 1,
	b => 2,
	a => 3
);

for (my $i = 0; $i < @config; $i++) {
	print STDERR "Processing Image ".($i+1)." of ".@config."\n";

	my $theight = (($i+1) * $height);
	my $fheight = (($i) * $height);
	my $sconfig = $config[$i];

	my $y = 0;
	for (my $ty = $fheight; $ty <= $theight;$ty++) {
		print STDERR "DONE: ".int(($y/$height)*100)."%\r";
		for (my $x = 0; $x < $width;$x++) {
			my %pixel;
			foreach my $ci (keys(%{$sconfig})) {
				my $imgString = $sconfig->{$ci};
				my ($iname,$cii)  = split(/:/,$imgString);
				my $img = $files{$iname};
				my @vals = $img->GetPixel(x=>$x,y=>$y);
				my $v = $vals[$cIndexMap{$cii}];
				$pixel{$ci} = $v;
			}
			my @nc = ($pixel{r},$pixel{g},$pixel{b},$pixel{a});
			my @nca = ($pixel{a},$pixel{a},$pixel{a},$pixel{a});
			#print STDERR $pixel{r}." ".$pixel{g}." ".$pixel{b}." ".$pixel{a}."\n";
			$outImage->SetPixel(x=>$x,y=>$ty,color=>\@nc);
			$outImage->SetPixel(x=>$x,y=>$ty,channel=>'Alpha',color=>\@nca);
		}
		$y++;
	}
	print "\n";
}

print STDOUT "Writing output image ...\n";
#$outImage->Write($outFilename);
$outImage->Write(filename=>$outFilename, compression=>'None');


